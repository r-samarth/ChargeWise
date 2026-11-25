from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import (
    ActivityListOut,
    NotificationListOut,
    NotificationOut,
    NotificationUpdateIn,
)
from app.services.firestore_service import FirestoreService

router = APIRouter(tags=["Notifications & Activity"])


@router.get("/notifications", response_model=NotificationListOut)
def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationListOut:
    fs = FirestoreService(db)
    fs.dispatch_pending_for_user(user.firebase_uid)
    db.commit()
    return fs.list_notifications(
        user.firebase_uid, unread_only=unread_only, limit=limit, cursor=cursor
    )


@router.patch("/notifications/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    updated = FirestoreService(db).mark_all_notifications_read(user.firebase_uid)
    return {"updated": updated}


@router.patch("/notifications/{notification_id}", response_model=NotificationOut)
def update_notification(
    notification_id: str,
    payload: NotificationUpdateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationOut:
    res = FirestoreService(db).mark_notification_read(
        user.firebase_uid, notification_id, payload.read
    )
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found."
        )
    return res


@router.get("/activity", response_model=ActivityListOut)
def list_activity(
    limit: int = Query(default=20, ge=1, le=50),
    cursor: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ActivityListOut:
    fs = FirestoreService(db)
    fs.dispatch_pending_for_user(user.firebase_uid)
    db.commit()
    return fs.list_activity(user.firebase_uid, limit=limit, cursor=cursor)
