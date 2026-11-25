from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.vehicle import VehicleCatalogOut, VehicleCreateIn, VehicleOut, VehicleUpdateIn
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("/catalog", response_model=list[VehicleCatalogOut])
def get_ev_catalog(db: Session = Depends(get_db)):
    return VehicleService(db).list_catalog()


@router.get("", response_model=list[VehicleOut])
def list_vehicles(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VehicleService(db).list_user_vehicles(user)


@router.post("", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VehicleService(db).create_vehicle(user, payload)


@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VehicleService(db).get_user_vehicle(user, vehicle_id)


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(
    vehicle_id: UUID,
    payload: VehicleUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return VehicleService(db).update_vehicle(user, vehicle_id, payload)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    VehicleService(db).delete_vehicle(user, vehicle_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
