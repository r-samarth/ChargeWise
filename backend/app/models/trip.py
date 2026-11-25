import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class Trip(Base, TimestampMixin):
    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    origin_name: Mapped[str] = mapped_column(String(160), nullable=False)
    origin_lat: Mapped[float] = mapped_column(Float, nullable=False)
    origin_lon: Mapped[float] = mapped_column(Float, nullable=False)
    destination_name: Mapped[str] = mapped_column(String(160), nullable=False)
    destination_lat: Mapped[float] = mapped_column(Float, nullable=False)
    destination_lon: Mapped[float] = mapped_column(Float, nullable=False)

    start_soc_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    target_arrival_soc_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    max_stops: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preferences_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    total_distance_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    estimated_drive_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_charge_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_energy_kwh: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    arrival_soc_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    routing_source: Mapped[str] = mapped_column(String(48), nullable=False, default="osrm_live")
    route_geojson: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    explanation_summary: Mapped[str] = mapped_column(Text, nullable=False)
    assumptions_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_saved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")

    owner = relationship("User", back_populates="trips")
    vehicle = relationship("Vehicle", back_populates="trips")
    stops = relationship(
        "TripStop", back_populates="trip", cascade="all, delete-orphan", order_by="TripStop.stop_order"
    )


class TripStop(Base):
    __tablename__ = "trip_stops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stop_order: Mapped[int] = mapped_column(Integer, nullable=False)
    station_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("charging_stations.id", ondelete="SET NULL"), nullable=True
    )
    connector_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("charging_connectors.id", ondelete="SET NULL"), nullable=True
    )
    station_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    distance_from_origin_km: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    detour_km: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False, default=0.0)
    arrival_soc_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    departure_soc_pct: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    energy_added_kwh: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    estimated_charge_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_power_kw: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    selection_reason: Mapped[str] = mapped_column(Text, nullable=False)
    alternatives_json: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    is_backup: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    trip = relationship("Trip", back_populates="stops")
