from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.vehicle import EVVehicleCatalog, Vehicle
from app.repositories.vehicle_repo import VehicleRepository
from app.schemas.vehicle import VALID_CONNECTOR_TYPES, VehicleCreateIn, VehicleUpdateIn


class VehicleService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = VehicleRepository(db)

    def list_catalog(self) -> list[EVVehicleCatalog]:
        return self.repo.list_catalog()

    def list_user_vehicles(self, user: User) -> list[Vehicle]:
        return self.repo.list_by_user(user.id)

    def get_user_vehicle(self, user: User, vehicle_id: UUID) -> Vehicle:
        vehicle = self.repo.get_by_id_for_user(vehicle_id, user.id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found or not owned by current user.",
            )
        return vehicle

    def create_vehicle(self, user: User, data: VehicleCreateIn) -> Vehicle:
        existing = self.repo.list_by_user(user.id)
        make_default = data.is_default or len(existing) == 0
        if make_default:
            self.repo.clear_default_for_user(user.id)

        vehicle = Vehicle(
            user_id=user.id,
            nickname=data.nickname.strip(),
            manufacturer=data.manufacturer.strip(),
            model=data.model.strip(),
            variant=data.variant.strip(),
            model_year=data.model_year,
            battery_capacity_kwh=data.battery_capacity_kwh,
            usable_battery_kwh=data.usable_battery_kwh,
            consumption_kwh_per_100km=data.consumption_kwh_per_100km,
            connector_types=data.connector_types,
            max_ac_power_kw=data.max_ac_power_kw,
            max_dc_power_kw=data.max_dc_power_kw,
            charging_curve_json=data.charging_curve_json,
            specs_source=data.specs_source,
            is_default=make_default,
        )
        self.repo.create(vehicle)
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    def update_vehicle(self, user: User, vehicle_id: UUID, data: VehicleUpdateIn) -> Vehicle:
        vehicle = self.get_user_vehicle(user, vehicle_id)
        payload = data.model_dump(exclude_unset=True)

        new_total = float(payload.get("battery_capacity_kwh", vehicle.battery_capacity_kwh))
        new_usable = float(payload.get("usable_battery_kwh", vehicle.usable_battery_kwh))
        if new_usable > new_total:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Usable battery capacity cannot exceed total battery capacity.",
            )

        if "connector_types" in payload and payload["connector_types"] is not None:
            normalized = [c.strip().upper() for c in payload["connector_types"] if c.strip()]
            unknown = [c for c in normalized if c not in VALID_CONNECTOR_TYPES]
            if not normalized or unknown:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid connector types provided.",
                )
            payload["connector_types"] = list(dict.fromkeys(normalized))

        if payload.get("is_default"):
            self.repo.clear_default_for_user(user.id)

        for field, val in payload.items():
            setattr(vehicle, field, val)

        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    def delete_vehicle(self, user: User, vehicle_id: UUID) -> None:
        vehicle = self.get_user_vehicle(user, vehicle_id)
        was_default = vehicle.is_default
        self.repo.delete(vehicle)
        self.db.flush()
        if was_default:
            remaining = self.repo.list_by_user(user.id)
            if remaining:
                remaining[0].is_default = True
        self.db.commit()
