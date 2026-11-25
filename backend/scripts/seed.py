"""Idempotent database seed & OSM Karnataka ingestion script."""
import sys
from pathlib import Path

from sqlalchemy import select

# Ensure backend root is importable
BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.database.base import utc_now  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.integrations.osm_parser import load_karnataka_osm_stations  # noqa: E402
from app.integrations.seed_data import (  # noqa: E402
    CORRIDOR_AMENITIES_SEED,
    CURATED_STATIONS_SEED,
    EV_CATALOG_SEED,
    OPERATORS_SEED,
)
from app.models.amenity import Amenity  # noqa: E402
from app.models.operator import Operator  # noqa: E402
from app.models.station import (  # noqa: E402
    ChargingConnector,
    ChargingStation,
    StationSourceRecord,
)
from app.models.vehicle import EVVehicleCatalog  # noqa: E402
from app.repositories.station_repo import StationRepository  # noqa: E402
from app.services.deduplication import evaluate_deduplication  # noqa: E402
from app.utils.geo import wkt_point  # noqa: E402


def seed_all() -> dict[str, int]:
    db = SessionLocal()
    repo = StationRepository(db)
    now = utc_now()
    stats = {"operators": 0, "catalog": 0, "curated_stations": 0, "osm_stations": 0, "osm_merged": 0, "amenities": 0}

    try:
        # 1. Operators
        op_map: dict[str, Operator] = {}
        for row in OPERATORS_SEED:
            existing = repo.get_operator_by_slug(row["slug"])
            if existing is None:
                existing = Operator(**row)
                db.add(existing)
                db.flush()
                stats["operators"] += 1
            op_map[row["slug"]] = existing

        # 2. EV Catalog
        for row in EV_CATALOG_SEED:
            exists = db.scalar(
                select(EVVehicleCatalog).where(
                    EVVehicleCatalog.manufacturer == row["manufacturer"],
                    EVVehicleCatalog.model == row["model"],
                    EVVehicleCatalog.variant == row["variant"],
                )
            )
            if exists is None:
                db.add(EVVehicleCatalog(**row))
                stats["catalog"] += 1

        # 3. Curated Verified Stations
        for row in CURATED_STATIONS_SEED:
            src_rec = repo.get_source_record(row["source"], row["source_id"])
            if src_rec is not None:
                continue
            op_obj = op_map.get(row["operator_slug"])
            station = ChargingStation(
                name=row["name"],
                operator_id=op_obj.id if op_obj else None,
                address=row["address"],
                city=row["city"],
                district=row["district"],
                state="Karnataka",
                latitude=row["latitude"],
                longitude=row["longitude"],
                location=wkt_point(row["latitude"], row["longitude"]),
                charging_type=row["charging_type"],
                opening_hours=row["opening_hours"],
                pricing_info=row["pricing_info"],
                pricing_verified=row["pricing_verified"],
                amenities_summary=row["amenities_summary"],
                official_station_url=row["official_station_url"],
                phone=row["phone"],
                source=row["source"],
                source_id=row["source_id"],
                verification_status=row["verification_status"],
                confidence_score=row["confidence_score"],
                last_verified_at=now,
                data_updated_at=now,
            )
            db.add(station)
            db.flush()
            for conn in row["connectors"]:
                db.add(ChargingConnector(station_id=station.id, **conn))
            db.add(
                StationSourceRecord(
                    station_id=station.id,
                    source_name=row["source"],
                    source_record_id=row["source_id"],
                    raw_name=row["name"],
                    raw_operator=op_obj.name if op_obj else None,
                    raw_address=row["address"],
                    raw_latitude=row["latitude"],
                    raw_longitude=row["longitude"],
                    raw_payload=row,
                    dedupe_status="matched",
                    match_score=1.0,
                )
            )
            stats["curated_stations"] += 1

        db.flush()

        # 4. Real OSM Karnataka stations (with deduplication)
        osm_raw = REPO_ROOT / "data" / "raw" / "osm_karnataka_chargers.json"
        if not osm_raw.exists():
            osm_raw = BACKEND_DIR / "app" / "integrations" / "osm_karnataka_chargers.json"
        for row in load_karnataka_osm_stations(osm_raw):
            if repo.get_source_record(row["source"], row["source_id"]) is not None:
                continue
            candidates = repo.find_dedupe_candidates(row["latitude"], row["longitude"], radius_meters=250.0)
            decision = evaluate_deduplication(
                name=row["name"],
                operator_name=row["raw_operator"],
                address=row["address"],
                latitude=row["latitude"],
                longitude=row["longitude"],
                candidates=candidates,
            )
            if decision.status == "matched" and decision.matched_station is not None:
                db.add(
                    StationSourceRecord(
                        station_id=decision.matched_station.id,
                        source_name=row["source"],
                        source_record_id=row["source_id"],
                        raw_name=row["name"],
                        raw_operator=row["raw_operator"],
                        raw_address=row["address"],
                        raw_latitude=row["latitude"],
                        raw_longitude=row["longitude"],
                        raw_payload=row["raw_payload"],
                        dedupe_status="matched",
                        match_score=decision.score,
                        match_breakdown=decision.breakdown,
                    )
                )
                stats["osm_merged"] += 1
            else:
                op_obj = op_map.get(row["operator_slug"] or "")
                station = ChargingStation(
                    name=row["name"],
                    operator_id=op_obj.id if op_obj else None,
                    address=row["address"],
                    city=row["city"],
                    district=row["district"],
                    state="Karnataka",
                    latitude=row["latitude"],
                    longitude=row["longitude"],
                    location=wkt_point(row["latitude"], row["longitude"]),
                    charging_type=row["charging_type"],
                    opening_hours=row["opening_hours"],
                    pricing_info=row["pricing_info"],
                    pricing_verified=row["pricing_verified"],
                    amenities_summary=[],
                    official_station_url=row["official_station_url"],
                    source=row["source"],
                    source_id=row["source_id"],
                    verification_status=row["verification_status"],
                    confidence_score=row["confidence_score"],
                    data_updated_at=now,
                )
                db.add(station)
                db.flush()
                for conn in row["connectors"]:
                    db.add(ChargingConnector(station_id=station.id, **conn))
                db.add(
                    StationSourceRecord(
                        station_id=decision.matched_station.id if decision.status == "pending_review" and decision.matched_station else station.id,
                        source_name=row["source"],
                        source_record_id=row["source_id"],
                        raw_name=row["name"],
                        raw_operator=row["raw_operator"],
                        raw_address=row["address"],
                        raw_latitude=row["latitude"],
                        raw_longitude=row["longitude"],
                        raw_payload=row["raw_payload"],
                        dedupe_status=decision.status,
                        match_score=decision.score,
                        match_breakdown=decision.breakdown,
                    )
                )
                stats["osm_stations"] += 1

        # 5. Verified Corridor Amenities
        for row in CORRIDOR_AMENITIES_SEED:
            exists = db.scalar(
                select(Amenity).where(Amenity.source_id == row["source_id"])
            )
            if exists is None:
                db.add(
                    Amenity(
                        name=row["name"],
                        category=row["category"],
                        address=row["address"],
                        city=row["city"],
                        latitude=row["latitude"],
                        longitude=row["longitude"],
                        location=wkt_point(row["latitude"], row["longitude"]),
                        opening_hours=row["opening_hours"],
                        rating=row["rating"],
                        family_friendly_tags=row["family_friendly_tags"],
                        source=row["source"],
                        source_id=row["source_id"],
                    )
                )
                stats["amenities"] += 1

        db.commit()
        return stats
    finally:
        db.close()


if __name__ == "__main__":
    result = seed_all()
    print("Seed completed:", result)
