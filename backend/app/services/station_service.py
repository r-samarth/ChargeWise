from datetime import timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.database.base import utc_now
from app.models.amenity import Amenity
from app.models.operator import Operator
from app.models.station import ChargingStation
from app.repositories.station_repo import StationRepository
from app.schemas.station import (
    AmenityOut,
    ConnectorOut,
    OperatorOut,
    StationDetailOut,
    StationListOut,
    StationOut,
)
from app.utils.geo import google_maps_nav_url


def _station_trust_note(station: ChargingStation) -> str:
    status_val = station.verification_status
    if status_val == "live_availability_confirmed":
        return "Live connector status received from an integrated feed."
    if status_val == "operational_status_verified":
        return "Location and connector specs verified from operator disclosures; live slot occupancy requires checking the operator app."
    if status_val == "location_verified":
        return "Coordinates and site verified; live charger occupancy is unknown."
    if status_val == "temporarily_unavailable":
        return "Marked temporarily unavailable; verify in operator app before routing."
    if status_val == "unknown_or_stale":
        return "Data may be outdated or incomplete; verify via official operator app or support phone."
    return "Listed from open registry; operator verification pending and live availability unknown."


def _is_station_stale(station: ChargingStation, stale_days: int = 180) -> bool:
    ref = station.last_verified_at or station.data_updated_at or station.updated_at
    if ref is None:
        return True
    return ref < (utc_now() - timedelta(days=stale_days))


def serialize_station(station: ChargingStation, distance_km: float | None = None) -> StationOut:
    return StationOut(
        id=station.id,
        name=station.name,
        operator_id=station.operator_id,
        operator=OperatorOut.model_validate(station.operator) if station.operator else None,
        address=station.address,
        city=station.city,
        district=station.district,
        state=station.state,
        latitude=station.latitude,
        longitude=station.longitude,
        charging_type=station.charging_type,
        opening_hours=station.opening_hours,
        pricing_info=station.pricing_info if station.pricing_verified else None,
        pricing_verified=station.pricing_verified,
        amenities_summary=station.amenities_summary or [],
        official_station_url=station.official_station_url,
        phone=station.phone,
        source=station.source,
        source_id=station.source_id,
        verification_status=station.verification_status,
        confidence_score=float(station.confidence_score),
        last_verified_at=station.last_verified_at,
        data_updated_at=station.data_updated_at,
        is_active=station.is_active,
        connectors=[
            ConnectorOut(
                id=c.id,
                station_id=c.station_id,
                connector_type=c.connector_type,
                current_type=c.current_type,
                power_kw=float(c.power_kw) if c.power_kw is not None else None,
                connector_count=c.connector_count,
                operational_status=c.operational_status,
                availability_status=c.availability_status,
                availability_updated_at=c.availability_updated_at,
            )
            for c in station.connectors
        ],
        distance_km=distance_km,
        navigation_url=google_maps_nav_url(station.latitude, station.longitude),
        trust_note=_station_trust_note(station),
    )


def serialize_amenity(amenity: Amenity, distance_km: float | None = None) -> AmenityOut:
    return AmenityOut(
        id=amenity.id,
        name=amenity.name,
        category=amenity.category,
        address=amenity.address,
        city=amenity.city,
        latitude=amenity.latitude,
        longitude=amenity.longitude,
        opening_hours=amenity.opening_hours,
        rating=float(amenity.rating) if amenity.rating is not None else None,
        family_friendly_tags=amenity.family_friendly_tags or [],
        source=amenity.source,
        distance_km=distance_km,
        navigation_url=google_maps_nav_url(amenity.latitude, amenity.longitude),
    )


class StationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = StationRepository(db)

    def list_operators(self) -> list[Operator]:
        return self.repo.list_operators()

    def get_operator(self, operator_id: UUID) -> Operator:
        op = self.repo.get_operator(operator_id)
        if op is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found.")
        return op

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
        page: int = 1,
        page_size: int = 25,
    ) -> StationListOut:
        stations, total = self.repo.list_stations(
            q=q,
            city=city,
            district=district,
            operator_slug=operator_slug,
            connector_type=connector_type,
            min_power_kw=min_power_kw,
            verification_status=verification_status,
            page=page,
            page_size=page_size,
        )
        return StationListOut(
            items=[serialize_station(s) for s in stations],
            total=total,
            page=page,
            page_size=page_size,
        )

    def nearby_stations(
        self,
        lat: float,
        lon: float,
        radius_km: float = 25.0,
        connector_type: str | None = None,
        limit: int = 30,
    ) -> list[StationOut]:
        pairs = self.repo.find_nearby_stations(
            lat, lon, radius_km=radius_km, connector_type=connector_type, limit=limit
        )
        return [serialize_station(s, distance_km=d) for s, d in pairs]

    def get_station_detail(self, station_id: UUID) -> StationDetailOut:
        station = self.repo.get_station(station_id)
        if station is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Station not found.")
        base = serialize_station(station)
        nearby_amenities = self.repo.find_nearby_amenities(
            station.latitude, station.longitude, radius_km=5.0, limit=12
        )
        return StationDetailOut(
            **base.model_dump(),
            nearby_amenities=[serialize_amenity(a, distance_km=d) for a, d in nearby_amenities],
            source_records_count=len(station.source_records),
            is_stale=_is_station_stale(station),
        )

    def nearby_amenities(
        self,
        lat: float,
        lon: float,
        radius_km: float = 4.0,
        category: str | None = None,
        limit: int = 20,
    ) -> list[AmenityOut]:
        pairs = self.repo.find_nearby_amenities(
            lat, lon, radius_km=radius_km, category=category, limit=limit
        )
        return [serialize_amenity(a, distance_km=d) for a, d in pairs]
