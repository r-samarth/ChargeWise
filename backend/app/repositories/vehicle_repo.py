from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.vehicle import EVVehicleCatalog, Vehicle


class VehicleRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_catalog(self) -> list[EVVehicleCatalog]:
        return list(
            self.db.scalars(
                select(EVVehicleCatalog).order_by(
                    EVVehicleCatalog.manufacturer, EVVehicleCatalog.model, EVVehicleCatalog.variant
                )
            )
        )

    def list_by_user(self, user_id: UUID) -> list[Vehicle]:
        return list(
            self.db.scalars(
                select(Vehicle)
                .where(Vehicle.user_id == user_id)
                .order_by(Vehicle.is_default.desc(), Vehicle.created_at.desc())
            )
        )

    def get_by_id_for_user(self, vehicle_id: UUID, user_id: UUID) -> Vehicle | None:
        return self.db.scalar(
            select(Vehicle).where(Vehicle.id == vehicle_id, Vehicle.user_id == user_id)
        )

    def clear_default_for_user(self, user_id: UUID) -> None:
        self.db.execute(
            update(Vehicle).where(Vehicle.user_id == user_id).values(is_default=False)
        )

    def create(self, vehicle: Vehicle) -> Vehicle:
        self.db.add(vehicle)
        self.db.flush()
        return vehicle

    def delete(self, vehicle: Vehicle) -> None:
        self.db.delete(vehicle)
        self.db.flush()
