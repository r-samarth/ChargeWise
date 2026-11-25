from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.admin import AnalyticsOverviewOut
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverviewOut)
def get_analytics_overview(db: Session = Depends(get_db)) -> AnalyticsOverviewOut:
    return AnalyticsService(db).overview()
