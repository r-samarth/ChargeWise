from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.station import AmenityOut, OperatorOut


class TripPlanRequestIn(BaseModel):
    vehicle_id: UUID
    origin_name: str = Field(min_length=2, max_length=160)
    origin_lat: float = Field(ge=11.0, le=19.0)
    origin_lon: float = Field(ge=73.5, le=79.0)
    destination_name: str = Field(min_length=2, max_length=160)
    destination_lat: float = Field(ge=11.0, le=19.0)
    destination_lon: float = Field(ge=73.5, le=79.0)
    start_soc_pct: float = Field(ge=5.0, le=100.0)
    target_arrival_soc_pct: float = Field(default=20.0, ge=5.0, le=90.0)
    reserve_soc_pct: float = Field(default=12.0, ge=5.0, le=40.0)
    max_stops: int | None = Field(default=None, ge=0, le=10)
    max_detour_km: float = Field(default=12.0, ge=1.0, le=50.0)
    prefer_fast_dc: bool = True
    preferred_amenities: list[str] = Field(default_factory=list, max_length=10)
    include_unverified_stations: bool = False
    save_trip: bool = False
    title: str | None = Field(default=None, max_length=200)

    @model_validator(mode="after")
    def validate_trip_bounds(self) -> "TripPlanRequestIn":
        if self.target_arrival_soc_pct < self.reserve_soc_pct:
            # Ensure target arrival is never lower than safety reserve unless user explicitly understands; keep reserve <= target
            self.reserve_soc_pct = min(self.reserve_soc_pct, self.target_arrival_soc_pct)
        return self


class TripStopOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    stop_order: int
    station_id: UUID | None = None
    connector_id: UUID | None = None
    station_name: str
    city: str | None = None
    district: str | None = None
    latitude: float
    longitude: float
    connector_type: str
    rated_power_kw: float
    effective_power_kw: float
    verification_status: str
    availability_status: str
    distance_from_origin_km: float
    detour_km: float
    arrival_soc_pct: float
    departure_soc_pct: float
    energy_added_kwh: float
    estimated_charge_minutes: int
    selection_reason: str
    navigation_url: str
    operator: OperatorOut | None = None
    nearby_amenities: list[AmenityOut] = Field(default_factory=list)
    alternatives: list[dict[str, Any]] = Field(default_factory=list)
    is_backup: bool = False


class SocProfilePoint(BaseModel):
    label: str
    distance_km: float
    soc_pct: float
    elevation_m: float | None = None


class TripPlanResponseOut(BaseModel):
    id: UUID | None = None
    feasible: bool
    failure_reason: str | None = None
    title: str
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    start_soc_pct: float
    target_arrival_soc_pct: float
    reserve_soc_pct: float
    total_distance_km: float
    estimated_drive_minutes: int
    estimated_charge_minutes: int
    total_trip_minutes: int
    total_energy_kwh: float
    arrival_soc_pct: float
    remaining_range_km: float
    routing_source: str
    elevation_adjusted: bool
    route_geojson: dict[str, Any]
    explanation_summary: str
    assumptions: list[str]
    limitations: list[str]
    stops: list[TripStopOut]
    soc_profile: list[SocProfilePoint]
    is_saved: bool = False
    created_at: datetime | None = None


class TripSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    vehicle_id: UUID | None = None
    origin_name: str
    destination_name: str
    start_soc_pct: float
    target_arrival_soc_pct: float
    total_distance_km: float
    estimated_drive_minutes: int
    estimated_charge_minutes: int
    total_energy_kwh: float
    arrival_soc_pct: float
    routing_source: str
    is_saved: bool
    status: str
    created_at: datetime


class TripSavePatchIn(BaseModel):
    is_saved: bool | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: str | None = Field(default=None, max_length=32)
