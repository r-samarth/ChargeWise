from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

VerificationStatusLiteral = Literal[
    "listed",
    "location_verified",
    "operational_status_verified",
    "temporarily_unavailable",
    "live_availability_confirmed",
    "unknown_or_stale",
]


class OperatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    official_website: str | None = None
    android_app_url: str | None = None
    ios_app_url: str | None = None
    support_phone: str | None = None
    support_email: str | None = None
    payment_information: str | None = None
    reservation_support: str
    api_or_ocpi_information: str | None = None


class OperatorCreateIn(BaseModel):
    slug: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=120)
    official_website: str | None = None
    android_app_url: str | None = None
    ios_app_url: str | None = None
    support_phone: str | None = None
    support_email: str | None = None
    payment_information: str | None = None
    reservation_support: str = "unknown"
    api_or_ocpi_information: str | None = None


class ConnectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    station_id: UUID
    connector_type: str
    current_type: str
    power_kw: float | None = None
    connector_count: int
    operational_status: str
    availability_status: str
    availability_updated_at: datetime | None = None


class ConnectorCreateIn(BaseModel):
    connector_type: str = Field(min_length=2, max_length=40)
    current_type: Literal["DC", "AC"] = "DC"
    power_kw: float | None = Field(default=None, gt=0.0, le=500.0)
    connector_count: int = Field(default=1, ge=1, le=50)
    operational_status: Literal["operational", "out_of_service", "maintenance", "unknown"] = "unknown"
    availability_status: Literal["available", "occupied", "unknown", "unavailable"] = "unknown"


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    category: str
    address: str | None = None
    city: str | None = None
    latitude: float
    longitude: float
    opening_hours: str | None = None
    rating: float | None = None
    family_friendly_tags: list[str] = Field(default_factory=list)
    source: str
    distance_km: float | None = None
    navigation_url: str | None = None


class AmenityCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    category: Literal[
        "restaurant", "cafe", "hotel", "washroom", "shopping", "hospital", "fuel", "parking"
    ]
    address: str | None = None
    city: str | None = None
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    opening_hours: str | None = None
    rating: float | None = Field(default=None, ge=0.0, le=5.0)
    family_friendly_tags: list[str] = Field(default_factory=list)
    source: str = "Admin Verified"


class StationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    operator_id: UUID | None = None
    operator: OperatorOut | None = None
    address: str
    city: str
    district: str
    state: str
    latitude: float
    longitude: float
    charging_type: str
    opening_hours: str | None = None
    pricing_info: str | None = None
    pricing_verified: bool
    amenities_summary: list[str] = Field(default_factory=list)
    official_station_url: str | None = None
    phone: str | None = None
    source: str
    source_id: str
    verification_status: str
    confidence_score: float
    last_verified_at: datetime | None = None
    data_updated_at: datetime | None = None
    is_active: bool
    connectors: list[ConnectorOut] = Field(default_factory=list)
    distance_km: float | None = None
    navigation_url: str | None = None
    trust_note: str | None = None


class StationDetailOut(StationOut):
    nearby_amenities: list[AmenityOut] = Field(default_factory=list)
    source_records_count: int = 0
    is_stale: bool = False


class StationListOut(BaseModel):
    items: list[StationOut]
    total: int
    page: int
    page_size: int


class StationCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    operator_id: UUID | None = None
    address: str = Field(min_length=3)
    city: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    state: str = "Karnataka"
    latitude: float = Field(ge=11.0, le=19.0)
    longitude: float = Field(ge=73.5, le=79.0)
    charging_type: Literal["DC_FAST", "AC", "MIXED", "SWAP_OR_2W"] = "DC_FAST"
    opening_hours: str | None = None
    pricing_info: str | None = None
    pricing_verified: bool = False
    amenities_summary: list[str] = Field(default_factory=list)
    official_station_url: str | None = None
    phone: str | None = None
    source: str = "Admin Entry"
    source_id: str = Field(min_length=1, max_length=160)
    verification_status: VerificationStatusLiteral = "location_verified"
    connectors: list[ConnectorCreateIn] = Field(default_factory=list)


class StationUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    operator_id: UUID | None = None
    address: str | None = None
    city: str | None = None
    district: str | None = None
    opening_hours: str | None = None
    pricing_info: str | None = None
    pricing_verified: bool | None = None
    amenities_summary: list[str] | None = None
    official_station_url: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class StationVerifyIn(BaseModel):
    verification_status: VerificationStatusLiteral
    notes: str | None = Field(default=None, max_length=500)
    confidence_score: float | None = Field(default=None, ge=0.0, le=1.0)
