from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.database.session import get_db
from app.models.user import User
from app.schemas.admin import (
    AuditLogOut,
    CsvImportResultOut,
    DataQualityOut,
    DuplicateResolutionIn,
    SourceRecordOut,
)
from app.schemas.station import (
    AmenityCreateIn,
    AmenityOut,
    ConnectorCreateIn,
    ConnectorOut,
    OperatorCreateIn,
    OperatorOut,
    StationCreateIn,
    StationOut,
    StationUpdateIn,
    StationVerifyIn,
)
from app.services.admin_service import AdminService
from app.services.station_service import serialize_amenity, serialize_station

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/operators", response_model=OperatorOut, status_code=status.HTTP_201_CREATED)
def admin_create_operator(
    payload: OperatorCreateIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).create_operator(actor, payload)


@router.post("/stations", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def admin_create_station(
    payload: StationCreateIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StationOut:
    return serialize_station(AdminService(db).create_station(actor, payload))


@router.patch("/stations/{station_id}", response_model=StationOut)
def admin_update_station(
    station_id: UUID,
    payload: StationUpdateIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StationOut:
    return serialize_station(AdminService(db).update_station(actor, station_id, payload))


@router.post(
    "/stations/{station_id}/connectors",
    response_model=ConnectorOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_add_connector(
    station_id: UUID,
    payload: ConnectorCreateIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).add_connector(actor, station_id, payload)


@router.post("/stations/{station_id}/verify", response_model=StationOut)
def admin_verify_station(
    station_id: UUID,
    payload: StationVerifyIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StationOut:
    return serialize_station(AdminService(db).verify_station(actor, station_id, payload))


@router.post("/amenities", response_model=AmenityOut, status_code=status.HTTP_201_CREATED)
def admin_create_amenity(
    payload: AmenityCreateIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AmenityOut:
    return serialize_amenity(AdminService(db).create_amenity(actor, payload))


@router.post("/import-csv", response_model=CsvImportResultOut)
async def admin_import_csv(
    file: UploadFile = File(...),
    source_name: str = Query(default="Admin CSV Import"),
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CsvImportResultOut:
    raw = (await file.read()).decode("utf-8", errors="replace")
    return AdminService(db).import_csv(actor, raw, source_name=source_name)


@router.get("/duplicates", response_model=list[SourceRecordOut])
def admin_list_duplicates(
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_duplicates()


@router.post("/duplicates/{source_record_id}/resolve", response_model=SourceRecordOut)
def admin_resolve_duplicate(
    source_record_id: UUID,
    payload: DuplicateResolutionIn,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).resolve_duplicate(actor, source_record_id, payload)


@router.get("/data-quality", response_model=DataQualityOut)
def admin_data_quality(
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataQualityOut:
    return AdminService(db).get_data_quality()


@router.get("/audit-logs", response_model=list[AuditLogOut])
def admin_audit_logs(
    limit: int = Query(default=50, ge=1, le=200),
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminService(db).list_audit_logs(limit=limit)
