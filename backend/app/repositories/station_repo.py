from uuid import UUID

from geoalchemy2.functions import ST_DWithin
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.amenity import Amenity
from app.models.operator import Operator
from app.models.station import (
    ChargingConnector,
    ChargingStation,
    StationSourceRecord,
    StationVerificationLog,
)
from app.utils.geo import haversine_km, wkt_point


class StationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_operators(self) -> list[Operator]:
        return list(self.db.scalars(select(Operator).order_by(Operator.name)))

    def get_operator(self, operator_id: UUID) -> Operator | None:
        return self.db.scalar(select(Operator).where(Operator.id == operator_id))

    def get_operator_by_slug(self, slug: str) -> Operator | None:
        return self.db.scalar(select(Operator).where(Operator.slug == slug))

    def list_stations(
        self,
        *,
        q: str | None = None,
        city: str | None = None,
        district: str | None = None,
        operator_slug: str | None = None,
        connector_type: str | None = None,
        min_power_kw: float | None = None,
        verification_status: str | None = None,
        only_active: bool = True,
        page: int = 1,
        page_size: int = 25,
    ) -> tuple[list[ChargingStation], int]:
        stmt = (
            select(ChargingStation)
            .options(selectinload(ChargingStation.operator), selectinload(ChargingStation.connectors))
        )
        if only_active:
            stmt = stmt.where(ChargingStation.is_active.is_(True))
        if q:
            like = f"%{q.strip()}%"
            stmt = stmt.where(
                ChargingStation.name.ilike(like)
                | ChargingStation.address.ilike(like)
                | ChargingStation.city.ilike(like)
                | ChargingStation.district.ilike(like)
            )
        if city:
            stmt = stmt.where(ChargingStation.city.ilike(f"%{city.strip()}%"))
        if district:
            stmt = stmt.where(ChargingStation.district.ilike(f"%{district.strip()}%"))
        if verification_status:
            stmt = stmt.where(ChargingStation.verification_status == verification_status)
        if operator_slug:
            stmt = stmt.join(Operator).where(Operator.slug == operator_slug)
        if connector_type or min_power_kw is not None:
            conn_sub = select(ChargingConnector.station_id)
            if connector_type:
                conn_sub = conn_sub.where(
                    ChargingConnector.connector_type == connector_type.strip().upper()
                )
            if min_power_kw is not None:
                conn_sub = conn_sub.where(ChargingConnector.power_kw >= min_power_kw)
            stmt = stmt.where(ChargingStation.id.in_(conn_sub))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int(self.db.scalar(count_stmt) or 0)

        items = list(
            self.db.scalars(
                stmt.order_by(ChargingStation.confidence_score.desc(), ChargingStation.name)
                .offset((page - 1) * page_size)
                .limit(page_size)
            ).unique()
        )
        return items, total

    def get_station(self, station_id: UUID) -> ChargingStation | None:
        return self.db.scalar(
            select(ChargingStation)
            .options(
                selectinload(ChargingStation.operator),
                selectinload(ChargingStation.connectors),
                selectinload(ChargingStation.source_records),
            )
            .where(ChargingStation.id == station_id)
        )

    def find_nearby_stations(
        self,
        lat: float,
        lon: float,
        radius_km: float = 25.0,
        connector_type: str | None = None,
        limit: int = 30,
    ) -> list[tuple[ChargingStation, float]]:
        point_expr = func.ST_GeogFromText(wkt_point(lat, lon))
        stmt = (
            select(ChargingStation)
            .options(selectinload(ChargingStation.operator), selectinload(ChargingStation.connectors))
            .where(
                ChargingStation.is_active.is_(True),
                ST_DWithin(ChargingStation.location, point_expr, radius_km * 1000.0),
            )
        )
        if connector_type:
            conn_sub = select(ChargingConnector.station_id).where(
                ChargingConnector.connector_type == connector_type.strip().upper()
            )
            stmt = stmt.where(ChargingStation.id.in_(conn_sub))

        stations = list(self.db.scalars(stmt).unique())
        with_dist = [
            (s, round(haversine_km(lat, lon, s.latitude, s.longitude), 3))
            for s in stations
        ]
        with_dist.sort(key=lambda pair: pair[1])
        return with_dist[:limit]

    def list_all_active_for_routing(self) -> list[ChargingStation]:
        return list(
            self.db.scalars(
                select(ChargingStation)
                .options(selectinload(ChargingStation.operator), selectinload(ChargingStation.connectors))
                .where(ChargingStation.is_active.is_(True))
            ).unique()
        )

    def find_nearby_amenities(
        self,
        lat: float,
        lon: float,
        radius_km: float = 3.0,
        category: str | None = None,
        limit: int = 20,
    ) -> list[tuple[Amenity, float]]:
        point_expr = func.ST_GeogFromText(wkt_point(lat, lon))
        stmt = select(Amenity).where(
            ST_DWithin(Amenity.location, point_expr, radius_km * 1000.0)
        )
        if category:
            stmt = stmt.where(Amenity.category == category)
        amenities = list(self.db.scalars(stmt))
        with_dist = [
            (a, round(haversine_km(lat, lon, a.latitude, a.longitude), 3))
            for a in amenities
        ]
        with_dist.sort(key=lambda pair: pair[1])
        return with_dist[:limit]

    def find_dedupe_candidates(
        self, lat: float, lon: float, radius_meters: float = 250.0
    ) -> list[ChargingStation]:
        point_expr = func.ST_GeogFromText(wkt_point(lat, lon))
        stmt = (
            select(ChargingStation)
            .options(selectinload(ChargingStation.operator))
            .where(ST_DWithin(ChargingStation.location, point_expr, radius_meters))
        )
        return list(self.db.scalars(stmt).unique())

    def get_source_record(self, source_name: str, source_record_id: str) -> StationSourceRecord | None:
        return self.db.scalar(
            select(StationSourceRecord).where(
                StationSourceRecord.source_name == source_name,
                StationSourceRecord.source_record_id == source_record_id,
            )
        )

    def add_verification_log(self, log: StationVerificationLog) -> None:
        self.db.add(log)
        self.db.flush()
