from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SourceRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    station_id: UUID | None = None
    source_name: str
    source_record_id: str
    raw_name: str | None = None
    raw_operator: str | None = None
    raw_address: str | None = None
    raw_latitude: float | None = None
    raw_longitude: float | None = None
    dedupe_status: str
    match_score: float | None = None
    match_breakdown: dict[str, Any] | None = None
    ingested_at: datetime


class DuplicateResolutionIn(BaseModel):
    action: Literal["merge_into_station", "create_new_station", "reject_duplicate"]
    target_station_id: UUID | None = None
    notes: str | None = None


class CsvImportRowError(BaseModel):
    row_number: int
    error: str


class CsvImportResultOut(BaseModel):
    total_rows: int
    created_stations: int
    merged_records: int
    pending_review: int
    skipped_duplicates: int
    errors: list[CsvImportRowError] = Field(default_factory=list)


class DataQualityOut(BaseModel):
    total_stations: int
    active_stations: int
    total_connectors: int
    total_operators: int
    total_amenities: int
    verification_breakdown: dict[str, int]
    stale_stations_count: int
    missing_opening_hours_count: int
    unverified_pricing_count: int
    pending_duplicate_reviews: int
    failed_outbox_events: int


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_user_id: UUID | None = None
    action: str
    entity_type: str
    entity_id: str
    details: dict[str, Any]
    created_at: datetime


class AnalyticsOverviewOut(BaseModel):
    total_stations: int
    total_connectors: int
    total_operators: int
    stations_by_district: list[dict[str, Any]]
    stations_by_operator: list[dict[str, Any]]
    connectors_by_type: list[dict[str, Any]]
    power_kw_distribution: list[dict[str, Any]]
    verification_breakdown: list[dict[str, Any]]
    karnataka_ev_benchmark: dict[str, Any]
