from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.trip import (
    TripPlanRequestIn,
    TripPlanResponseOut,
    TripSavePatchIn,
    TripSummaryOut,
)
from app.services.trip_service import TripService

router = APIRouter(prefix="/trips", tags=["Trip Planner"])


@router.post("/plan", response_model=TripPlanResponseOut)
async def plan_trip(
    payload: TripPlanRequestIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TripPlanResponseOut:
    return await TripService(db).plan_trip(user, payload)


@router.get("", response_model=list[TripSummaryOut])
def list_trips(
    saved_only: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TripService(db).list_trips(user, saved_only=saved_only)


@router.get("/{trip_id}", response_model=TripPlanResponseOut)
def get_trip(
    trip_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TripPlanResponseOut:
    return TripService(db).get_trip_detail(user, trip_id)


@router.patch("/{trip_id}", response_model=TripSummaryOut)
def patch_trip(
    trip_id: UUID,
    payload: TripSavePatchIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TripService(db).patch_trip(user, trip_id, payload)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    TripService(db).delete_trip(user, trip_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
