from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

VALID_CONNECTOR_TYPES = {
    "CCS2",
    "TYPE_2",
    "CHADEMO",
    "BHARAT_DC_001",
    "BHARAT_AC_001",
    "ATHER_PROPRIETARY",
    "TYPE_6",
}


class VehicleCatalogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    manufacturer: str
    model: str
    variant: str
    model_year: int
    battery_capacity_kwh: float
    usable_battery_kwh: float
    consumption_kwh_per_100km: float
    connector_types: list[str]
    max_ac_power_kw: float
    max_dc_power_kw: float
    charging_curve_json: list[dict] | None = None
    specs_source: str
    specs_notes: str | None = None


class VehicleCreateIn(BaseModel):
    nickname: str = Field(min_length=1, max_length=100)
    manufacturer: str = Field(min_length=1, max_length=80)
    model: str = Field(min_length=1, max_length=80)
    variant: str = Field(min_length=1, max_length=120)
    model_year: int = Field(ge=2015, le=2030)
    battery_capacity_kwh: float = Field(gt=0.5, le=250.0)
    usable_battery_kwh: float = Field(gt=0.5, le=250.0)
    consumption_kwh_per_100km: float = Field(gt=1.0, le=60.0)
    connector_types: list[str] = Field(min_length=1, max_length=6)
    max_ac_power_kw: float = Field(ge=0.0, le=50.0)
    max_dc_power_kw: float = Field(ge=0.0, le=400.0)
    charging_curve_json: list[dict] | None = None
    specs_source: Literal["oem_verified", "user_entered", "estimated"] = "user_entered"
    is_default: bool = False

    @model_validator(mode="after")
    def validate_ev_physics(self) -> "VehicleCreateIn":
        if self.usable_battery_kwh > self.battery_capacity_kwh:
            raise ValueError("Usable battery capacity cannot exceed total battery capacity.")
        normalized = [c.strip().upper() for c in self.connector_types if c.strip()]
        if not normalized:
            raise ValueError("At least one valid connector type is required.")
        unknown = [c for c in normalized if c not in VALID_CONNECTOR_TYPES]
        if unknown:
            raise ValueError(f"Unsupported connector types: {', '.join(unknown)}")
        self.connector_types = list(dict.fromkeys(normalized))
        if self.max_ac_power_kw == 0 and self.max_dc_power_kw == 0:
            raise ValueError("Vehicle must support at least AC or DC charging power (> 0 kW).")
        return self


class VehicleUpdateIn(BaseModel):
    nickname: str | None = Field(default=None, min_length=1, max_length=100)
    manufacturer: str | None = Field(default=None, min_length=1, max_length=80)
    model: str | None = Field(default=None, min_length=1, max_length=80)
    variant: str | None = Field(default=None, min_length=1, max_length=120)
    model_year: int | None = Field(default=None, ge=2015, le=2030)
    battery_capacity_kwh: float | None = Field(default=None, gt=0.5, le=250.0)
    usable_battery_kwh: float | None = Field(default=None, gt=0.5, le=250.0)
    consumption_kwh_per_100km: float | None = Field(default=None, gt=1.0, le=60.0)
    connector_types: list[str] | None = Field(default=None, min_length=1, max_length=6)
    max_ac_power_kw: float | None = Field(default=None, ge=0.0, le=50.0)
    max_dc_power_kw: float | None = Field(default=None, ge=0.0, le=400.0)
    charging_curve_json: list[dict] | None = None
    specs_source: Literal["oem_verified", "user_entered", "estimated"] | None = None
    is_default: bool | None = None


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    nickname: str
    manufacturer: str
    model: str
    variant: str
    model_year: int
    battery_capacity_kwh: float
    usable_battery_kwh: float
    consumption_kwh_per_100km: float
    connector_types: list[str]
    max_ac_power_kw: float
    max_dc_power_kw: float
    charging_curve_json: list[dict] | None = None
    specs_source: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
