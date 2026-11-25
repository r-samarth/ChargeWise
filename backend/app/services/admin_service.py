import csv
import io
from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database.base import utc_now
from app.models.amenity import Amenity
from app.models.operator import Operator
from app.models.station import (
    VERIFICATION_STATUSES,
    ChargingConnector,
    ChargingStation,
    StationSourceRecord,
    StationVerificationLog,
)
from app.models.system import AuditLog, SyncOutbox
from app.models.user import User
from app.repositories.station_repo import StationRepository
from app.schemas.admin import (
    CsvImportResultOut,
    CsvImportRowError,
    DataQualityOut,
    DuplicateResolutionIn,
)
from app.schemas.station import (
    AmenityCreateIn,
    ConnectorCreateIn,
    OperatorCreateIn,
    StationCreateIn,
    StationUpdateIn,
    StationVerifyIn,
)
from app.services.deduplication import evaluate_deduplication, normalize_operator_name
from app.utils.geo import wkt_point


class AdminService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StationRepository(db)

    def _audit(
        self, actor: User, action: str, entity_type: str, entity_id: str, details: dict
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
            )
        )

    def create_operator(self, actor: User, data: OperatorCreateIn) -> Operator:
        if self.repo.get_operator_by_slug(data.slug):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Operator slug already exists."
            )
        op = Operator(**data.model_dump())
        self.db.add(op)
        self.db.flush()
        self._audit(actor, "operator.create", "operator", str(op.id), {"slug": op.slug})
        self.db.commit()
        self.db.refresh(op)
        return op

    def create_station(self, actor: User, data: StationCreateIn) -> ChargingStation:
        now = utc_now()
        station = ChargingStation(
            name=data.name.strip(),
            operator_id=data.operator_id,
            address=data.address.strip(),
            city=data.city.strip(),
            district=data.district.strip(),
            state=data.state.strip(),
            latitude=data.latitude,
            longitude=data.longitude,
            location=wkt_point(data.latitude, data.longitude),
            charging_type=data.charging_type,
            opening_hours=data.opening_hours,
            pricing_info=data.pricing_info if data.pricing_verified else None,
            pricing_verified=data.pricing_verified,
            amenities_summary=data.amenities_summary,
            official_station_url=data.official_station_url,
            phone=data.phone,
            source=data.source,
            source_id=data.source_id,
            verification_status=data.verification_status,
            confidence_score=0.85 if data.verification_status != "listed" else 0.55,
            last_verified_at=now if data.verification_status != "listed" else None,
            data_updated_at=now,
        )
        self.db.add(station)
        self.db.flush()

        for c in data.connectors:
            self.db.add(
                ChargingConnector(
                    station_id=station.id,
                    connector_type=c.connector_type.strip().upper(),
                    current_type=c.current_type,
                    power_kw=c.power_kw,
                    connector_count=c.connector_count,
                    operational_status=c.operational_status,
                    availability_status=c.availability_status,
                )
            )
        self.db.add(
            StationSourceRecord(
                station_id=station.id,
                source_name=data.source,
                source_record_id=data.source_id,
                raw_name=station.name,
                raw_address=station.address,
                raw_latitude=station.latitude,
                raw_longitude=station.longitude,
                raw_payload=data.model_dump(mode="json"),
                dedupe_status="matched",
                match_score=1.0,
            )
        )
        self._audit(actor, "station.create", "charging_station", str(station.id), {"name": station.name})
        self.db.commit()
        return self.repo.get_station(station.id)  # type: ignore[return-value]

    def update_station(
        self, actor: User, station_id: UUID, data: StationUpdateIn
    ) -> ChargingStation:
        station = self.repo.get_station(station_id)
        if station is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found.")
        updates = data.model_dump(exclude_unset=True)
        for field, val in updates.items():
            setattr(station, field, val)
        station.data_updated_at = utc_now()
        self._audit(actor, "station.update", "charging_station", str(station.id), updates)
        self.db.commit()
        return self.repo.get_station(station.id)  # type: ignore[return-value]

    def add_connector(
        self, actor: User, station_id: UUID, data: ConnectorCreateIn
    ) -> ChargingConnector:
        station = self.repo.get_station(station_id)
        if station is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found.")
        conn = ChargingConnector(
            station_id=station.id,
            connector_type=data.connector_type.strip().upper(),
            current_type=data.current_type,
            power_kw=data.power_kw,
            connector_count=data.connector_count,
            operational_status=data.operational_status,
            availability_status=data.availability_status,
        )
        self.db.add(conn)
        self.db.flush()
        self._audit(
            actor,
            "connector.create",
            "charging_connector",
            str(conn.id),
            {"station_id": str(station.id), "connector_type": conn.connector_type},
        )
        self.db.commit()
        self.db.refresh(conn)
        return conn

    def verify_station(
        self, actor: User, station_id: UUID, data: StationVerifyIn
    ) -> ChargingStation:
        station = self.repo.get_station(station_id)
        if station is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found.")
        prev = station.verification_status
        station.verification_status = data.verification_status
        if data.confidence_score is not None:
            station.confidence_score = data.confidence_score
        station.last_verified_at = utc_now()
        self.repo.add_verification_log(
            StationVerificationLog(
                station_id=station.id,
                previous_status=prev,
                new_status=data.verification_status,
                notes=data.notes,
                verified_by_user_id=actor.id,
            )
        )
        self._audit(
            actor,
            "station.verify",
            "charging_station",
            str(station.id),
            {"from": prev, "to": data.verification_status, "notes": data.notes},
        )
        self.db.commit()
        return self.repo.get_station(station.id)  # type: ignore[return-value]

    def create_amenity(self, actor: User, data: AmenityCreateIn) -> Amenity:
        amenity = Amenity(
            name=data.name.strip(),
            category=data.category,
            address=data.address,
            city=data.city,
            latitude=data.latitude,
            longitude=data.longitude,
            location=wkt_point(data.latitude, data.longitude),
            opening_hours=data.opening_hours,
            rating=data.rating,
            family_friendly_tags=data.family_friendly_tags,
            source=data.source,
        )
        self.db.add(amenity)
        self.db.flush()
        self._audit(actor, "amenity.create", "amenity", str(amenity.id), {"name": amenity.name})
        self.db.commit()
        self.db.refresh(amenity)
        return amenity

    def import_csv(self, actor: User, csv_text: str, source_name: str = "Admin CSV Import") -> CsvImportResultOut:
        reader = csv.DictReader(io.StringIO(csv_text))
        required = {"name", "address", "city", "district", "latitude", "longitude"}
        if not reader.fieldnames or not required.issubset({f.strip() for f in reader.fieldnames}):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"CSV must contain headers: {', '.join(sorted(required))}",
            )

        total = created = merged = pending = skipped = 0
        errors: list[CsvImportRowError] = []
        now = utc_now()

        for idx, row in enumerate(reader, start=2):
            total += 1
            try:
                name = (row.get("name") or "").strip()
                address = (row.get("address") or "").strip()
                city = (row.get("city") or "").strip()
                district = (row.get("district") or "").strip()
                state = (row.get("state") or "Karnataka").strip() or "Karnataka"
                lat = float(row["latitude"])
                lon = float(row["longitude"])
                if not name or not city or not (11.0 <= lat <= 19.0 and 73.5 <= lon <= 79.0):
                    raise ValueError("Invalid name/city or coordinates outside Karnataka bounds.")

                src_id = (row.get("source_id") or f"{name.lower()}_{lat:.5f}_{lon:.5f}").strip()
                existing_src = self.repo.get_source_record(source_name, src_id)
                if existing_src is not None:
                    skipped += 1
                    continue

                op_name = (row.get("operator") or "").strip() or None
                op_slug = normalize_operator_name(op_name) if op_name else None
                operator_obj = self.repo.get_operator_by_slug(op_slug) if op_slug else None

                candidates = self.repo.find_dedupe_candidates(lat, lon, radius_meters=250.0)
                decision = evaluate_deduplication(
                    name=name,
                    operator_name=op_name,
                    address=address,
                    latitude=lat,
                    longitude=lon,
                    candidates=candidates,
                )

                if decision.status == "matched" and decision.matched_station is not None:
                    merged += 1
                    decision.matched_station.data_updated_at = now
                    self.db.add(
                        StationSourceRecord(
                            station_id=decision.matched_station.id,
                            source_name=source_name,
                            source_record_id=src_id,
                            raw_name=name,
                            raw_operator=op_name,
                            raw_address=address,
                            raw_latitude=lat,
                            raw_longitude=lon,
                            raw_payload=dict(row),
                            dedupe_status="matched",
                            match_score=decision.score,
                            match_breakdown=decision.breakdown,
                        )
                    )
                elif decision.status == "pending_review" and decision.matched_station is not None:
                    pending += 1
                    self.db.add(
                        StationSourceRecord(
                            station_id=decision.matched_station.id,
                            source_name=source_name,
                            source_record_id=src_id,
                            raw_name=name,
                            raw_operator=op_name,
                            raw_address=address,
                            raw_latitude=lat,
                            raw_longitude=lon,
                            raw_payload=dict(row),
                            dedupe_status="pending_review",
                            match_score=decision.score,
                            match_breakdown=decision.breakdown,
                        )
                    )
                else:
                    created += 1
                    station = ChargingStation(
                        name=name,
                        operator_id=operator_obj.id if operator_obj else None,
                        address=address,
                        city=city,
                        district=district,
                        state=state,
                        latitude=lat,
                        longitude=lon,
                        location=wkt_point(lat, lon),
                        charging_type=(row.get("charging_type") or "DC_FAST").strip().upper(),
                        opening_hours=(row.get("opening_hours") or "").strip() or None,
                        source=source_name,
                        source_id=src_id,
                        verification_status="listed",
                        confidence_score=0.55,
                        data_updated_at=now,
                    )
                    self.db.add(station)
                    self.db.flush()
                    conn_type = (row.get("connector_type") or "").strip().upper()
                    if conn_type:
                        pw_raw = (row.get("power_kw") or "").strip()
                        self.db.add(
                            ChargingConnector(
                                station_id=station.id,
                                connector_type=conn_type,
                                current_type="AC" if conn_type in {"TYPE_2", "BHARAT_AC_001"} else "DC",
                                power_kw=float(pw_raw) if pw_raw else None,
                                operational_status="unknown",
                                availability_status="unknown",
                            )
                        )
                    self.db.add(
                        StationSourceRecord(
                            station_id=station.id,
                            source_name=source_name,
                            source_record_id=src_id,
                            raw_name=name,
                            raw_operator=op_name,
                            raw_address=address,
                            raw_latitude=lat,
                            raw_longitude=lon,
                            raw_payload=dict(row),
                            dedupe_status="new_station",
                            match_score=decision.score,
                            match_breakdown=decision.breakdown,
                        )
                    )
            except Exception as exc:
                errors.append(CsvImportRowError(row_number=idx, error=str(exc)))

        self._audit(
            actor,
            "station.csv_import",
            "csv_batch",
            source_name,
            {
                "total_rows": total,
                "created": created,
                "merged": merged,
                "pending": pending,
                "skipped": skipped,
                "errors": len(errors),
            },
        )
        self.db.commit()
        return CsvImportResultOut(
            total_rows=total,
            created_stations=created,
            merged_records=merged,
            pending_review=pending,
            skipped_duplicates=skipped,
            errors=errors,
        )

    def list_duplicates(self) -> list[StationSourceRecord]:
        return list(
            self.db.scalars(
                select(StationSourceRecord)
                .where(StationSourceRecord.dedupe_status == "pending_review")
                .order_by(StationSourceRecord.ingested_at.desc())
            )
        )

    def resolve_duplicate(
        self, actor: User, source_record_id: UUID, data: DuplicateResolutionIn
    ) -> StationSourceRecord:
        rec = self.db.scalar(
            select(StationSourceRecord).where(StationSourceRecord.id == source_record_id)
        )
        if rec is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Source record not found."
            )

        if data.action == "merge_into_station":
            target_id = data.target_station_id or rec.station_id
            if target_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="target_station_id is required to merge.",
                )
            rec.station_id = target_id
            rec.dedupe_status = "matched"
        elif data.action == "reject_duplicate":
            rec.dedupe_status = "rejected_duplicate"
        elif data.action == "create_new_station":
            if rec.raw_latitude is None or rec.raw_longitude is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Source record missing coordinates.",
                )
            station = ChargingStation(
                name=rec.raw_name or "Imported Station",
                address=rec.raw_address or "Karnataka",
                city="Bengaluru",
                district="Bengaluru Urban",
                state="Karnataka",
                latitude=rec.raw_latitude,
                longitude=rec.raw_longitude,
                location=wkt_point(rec.raw_latitude, rec.raw_longitude),
                source=rec.source_name,
                source_id=rec.source_record_id,
                verification_status="listed",
                confidence_score=0.55,
                data_updated_at=utc_now(),
            )
            self.db.add(station)
            self.db.flush()
            rec.station_id = station.id
            rec.dedupe_status = "new_station"

        self._audit(
            actor,
            "dedupe.resolve",
            "station_source_record",
            str(rec.id),
            {"action": data.action, "notes": data.notes},
        )
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def get_data_quality(self) -> DataQualityOut:
        stations = list(self.db.scalars(select(ChargingStation)))
        stale_cutoff = utc_now() - timedelta(days=180)
        breakdown = {s: 0 for s in VERIFICATION_STATUSES}
        stale = missing_hours = unverified_price = active_count = 0
        for st in stations:
            if st.is_active:
                active_count += 1
            breakdown[st.verification_status] = breakdown.get(st.verification_status, 0) + 1
            ref = st.last_verified_at or st.data_updated_at or st.updated_at
            if ref is None or ref < stale_cutoff:
                stale += 1
            if not st.opening_hours:
                missing_hours += 1
            if not st.pricing_verified:
                unverified_price += 1

        return DataQualityOut(
            total_stations=len(stations),
            active_stations=active_count,
            total_connectors=int(self.db.scalar(select(func.count(ChargingConnector.id))) or 0),
            total_operators=int(self.db.scalar(select(func.count(Operator.id))) or 0),
            total_amenities=int(self.db.scalar(select(func.count(Amenity.id))) or 0),
            verification_breakdown=breakdown,
            stale_stations_count=stale,
            missing_opening_hours_count=missing_hours,
            unverified_pricing_count=unverified_price,
            pending_duplicate_reviews=int(
                self.db.scalar(
                    select(func.count(StationSourceRecord.id)).where(
                        StationSourceRecord.dedupe_status == "pending_review"
                    )
                )
                or 0
            ),
            failed_outbox_events=int(
                self.db.scalar(
                    select(func.count(SyncOutbox.id)).where(SyncOutbox.status == "failed")
                )
                or 0
            ),
        )

    def list_audit_logs(self, limit: int = 50) -> list[AuditLog]:
        return list(
            self.db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit))
        )
