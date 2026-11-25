from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.station import AmenityOut, OperatorOut, StationDetailOut, StationListOut, StationOut
from app.services.station_service import StationService

router = APIRouter(tags=["Charging Infrastructure"])


@router.get("/stations", response_model=StationListOut)
def list_stations(
    q: str | None = Query(default=None),
    city: str | None = Query(default=None),
    district: str | None = Query(default=None),
    operator: str | None = Query(default=None),
    connector_type: str | None = Query(default=None),
    min_power_kw: float | None = Query(default=None, ge=0),
    verification_status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> StationListOut:
    return StationService(db).list_stations(
        q=q,
        city=city,
        district=district,
        operator_slug=operator,
        connector_type=connector_type,
        min_power_kw=min_power_kw,
        verification_status=verification_status,
        page=page,
        page_size=page_size,
    )


@router.get("/stations/nearby", response_model=list[StationOut])
def nearby_stations(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=25.0, gt=0, le=200),
    connector_type: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[StationOut]:
    return StationService(db).nearby_stations(
        lat, lon, radius_km=radius_km, connector_type=connector_type, limit=limit
    )


@router.get("/stations/{station_id}", response_model=StationDetailOut)
def get_station(station_id: UUID, db: Session = Depends(get_db)) -> StationDetailOut:
    return StationService(db).get_station_detail(station_id)


@router.get("/operators", response_model=list[OperatorOut])
def list_operators(db: Session = Depends(get_db)):
    return StationService(db).list_operators()


@router.get("/operators/{operator_id}", response_model=OperatorOut)
def get_operator(operator_id: UUID, db: Session = Depends(get_db)):
    return StationService(db).get_operator(operator_id)


@router.get("/amenities/nearby", response_model=list[AmenityOut])
def nearby_amenities(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(default=4.0, gt=0, le=50),
    category: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[AmenityOut]:
    return StationService(db).nearby_amenities(
        lat, lon, radius_km=radius_km, category=category, limit=limit
    )
