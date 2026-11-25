import uuid
from datetime import datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, utc_now

VERIFICATION_STATUSES = (
    "listed",
    "location_verified",
    "operational_status_verified",
    "temporarily_unavailable",
    "live_availability_confirmed",
    "unknown_or_stale",
)


class ChargingStation(Base, TimestampMixin):
    __tablename__ = "charging_stations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    operator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operators.id", ondelete="SET NULL"), nullable=True, index=True
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(80), nullable=False, default="Karnataka", index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False
    )
    charging_type: Mapped[str] = mapped_column(String(32), nullable=False, default="MIXED")
    opening_hours: Mapped[str | None] = mapped_column(String(160), nullable=True)
    pricing_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    pricing_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    amenities_summary: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    official_station_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    source_id: Mapped[str] = mapped_column(String(160), nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="listed", index=True
    )
    confidence_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.500)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    operator = relationship("Operator", back_populates="stations")
    connectors = relationship(
        "ChargingConnector", back_populates="station", cascade="all, delete-orphan"
    )
    source_records = relationship("StationSourceRecord", back_populates="station")
    verification_logs = relationship(
        "StationVerificationLog", back_populates="station", cascade="all, delete-orphan"
    )


class ChargingConnector(Base, TimestampMixin):
    __tablename__ = "charging_connectors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("charging_stations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    connector_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    current_type: Mapped[str] = mapped_column(String(8), nullable=False, default="DC")
    power_kw: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    connector_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    operational_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    availability_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unknown")
    availability_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    station = relationship("ChargingStation", back_populates="connectors")


class StationSourceRecord(Base):
    __tablename__ = "station_source_records"
    __table_args__ = (
        UniqueConstraint("source_name", "source_record_id", name="uq_source_name_record_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("charging_stations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source_name: Mapped[str] = mapped_column(String(120), nullable=False)
    source_record_id: Mapped[str] = mapped_column(String(160), nullable=False)
    raw_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_operator: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    dedupe_status: Mapped[str] = mapped_column(String(32), nullable=False, default="matched", index=True)
    match_score: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    match_breakdown: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    station = relationship("ChargingStation", back_populates="source_records")


class StationVerificationLog(Base):
    __tablename__ = "station_verification_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    station_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("charging_stations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_status: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    station = relationship("ChargingStation", back_populates="verification_logs")
