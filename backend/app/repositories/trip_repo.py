from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.trip import Trip


class TripRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_user(self, user_id: UUID, saved_only: bool = False) -> list[Trip]:
        stmt = (
            select(Trip)
            .options(selectinload(Trip.stops))
            .where(Trip.user_id == user_id)
        )
        if saved_only:
            stmt = stmt.where(Trip.is_saved.is_(True))
        return list(self.db.scalars(stmt.order_by(Trip.created_at.desc())).unique())

    def get_by_id_for_user(self, trip_id: UUID, user_id: UUID) -> Trip | None:
        return self.db.scalar(
            select(Trip)
            .options(selectinload(Trip.stops))
            .where(Trip.id == trip_id, Trip.user_id == user_id)
        )

    def create(self, trip: Trip) -> Trip:
        self.db.add(trip)
        self.db.flush()
        return trip

    def delete(self, trip: Trip) -> None:
        self.db.delete(trip)
        self.db.flush()
