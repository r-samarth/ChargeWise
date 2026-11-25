import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin


class EVVehicleCatalog(Base):
    __tablename__ = "ev_vehicle_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manufacturer: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    variant: Mapped[str] = mapped_column(String(120), nullable=False)
    model_year: Mapped[int] = mapped_column(Integer, nullable=False)
    battery_capacity_kwh: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    usable_battery_kwh: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    consumption_kwh_per_100km: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    connector_types: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    max_ac_power_kw: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    max_dc_power_kw: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    charging_curve_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    specs_source: Mapped[str] = mapped_column(String(48), nullable=False, default="oem_verified")
    specs_notes: Mapped[str | None] = mapped_column(String(240), nullable=True)


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"
    __table_args__ = (
        CheckConstraint("battery_capacity_kwh > 0", name="ck_vehicle_battery_positive"),
        CheckConstraint(
            "usable_battery_kwh > 0 AND usable_battery_kwh <= battery_capacity_kwh",
            name="ck_vehicle_usable_lte_total",
        ),
        CheckConstraint("consumption_kwh_per_100km > 0", name="ck_vehicle_consumption_positive"),
        CheckConstraint("max_ac_power_kw >= 0 AND max_dc_power_kw >= 0", name="ck_vehicle_power_nonneg"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nickname: Mapped[str] = mapped_column(String(100), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(80), nullable=False)
    variant: Mapped[str] = mapped_column(String(120), nullable=False)
    model_year: Mapped[int] = mapped_column(Integer, nullable=False)
    battery_capacity_kwh: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    usable_battery_kwh: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    consumption_kwh_per_100km: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    connector_types: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    max_ac_power_kw: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    max_dc_power_kw: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    charging_curve_json: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    specs_source: Mapped[str] = mapped_column(String(48), nullable=False, default="user_entered")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    owner = relationship("User", back_populates="vehicles")
    trips = relationship("Trip", back_populates="vehicle")
