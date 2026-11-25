import logging
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore as admin_firestore
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.firebase import get_firestore_client
from app.database.base import utc_now
from app.models.system import SyncOutbox
from app.schemas.user import (
    ActivityListOut,
    ActivityOut,
    NotificationListOut,
    NotificationOut,
    UserPreferencesIn,
    UserPreferencesOut,
)

logger = logging.getLogger(__name__)


def _to_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return None


class FirestoreService:
    """Manages Firestore user-facing documents and idempotent outbox dispatch."""

    def __init__(self, db: Session):
        self.db = db

    def enqueue_outbox(
        self,
        *,
        aggregate_type: str,
        aggregate_id: str,
        idempotency_key: str,
        payload: dict[str, Any],
    ) -> SyncOutbox:
        existing = self.db.scalar(
            select(SyncOutbox).where(SyncOutbox.idempotency_key == idempotency_key)
        )
        if existing:
            return existing
        entry = SyncOutbox(
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            target_system="firestore",
            idempotency_key=idempotency_key,
            payload=payload,
            status="pending",
        )
        self.db.add(entry)
        self.db.flush()
        return entry

    def dispatch_outbox_entry(self, entry: SyncOutbox) -> bool:
        """Attempt idempotent dispatch to Firestore. Records failures safely without raising."""
        client = get_firestore_client()
        if client is None:
            entry.status = "failed"
            entry.attempts += 1
            entry.last_error = "Firestore client unavailable"
            self.db.flush()
            return False

        try:
            payload = entry.payload
            uid = payload["firebase_uid"]
            op = payload["op"]
            user_ref = client.collection("users").document(uid)

            if op == "init_user":
                user_ref.set(
                    {
                        "firebaseUid": uid,
                        "displayName": payload.get("display_name") or "",
                        "email": payload.get("email") or "",
                        "photoURL": None,
                        "notificationSettings": {
                            "tripReminders": True,
                            "dataAlerts": True,
                            "emailDigest": False,
                        },
                        "createdAt": admin_firestore.SERVER_TIMESTAMP,
                        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
                    },
                    merge=True,
                )
                pref_ref = user_ref.collection("settings").document("preferences")
                if not pref_ref.get().exists:
                    pref_ref.set(
                        {
                            "preferredUnits": "metric",
                            "preferredMapStyle": "standard",
                            "preferredRouteSettings": {
                                "reserveSocPct": 15,
                                "preferFastChargers": True,
                                "maxDetourKm": 12,
                                "preferredAmenities": ["restaurant", "washroom"],
                            },
                            "preferredNotificationSettings": {
                                "tripReminders": True,
                                "dataAlerts": True,
                                "emailDigest": False,
                            },
                            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
                        }
                    )
            elif op == "update_user":
                user_ref.set(
                    {
                        "firebaseUid": uid,
                        "displayName": payload.get("display_name") or "",
                        "updatedAt": admin_firestore.SERVER_TIMESTAMP,
                    },
                    merge=True,
                )
            elif op == "notification_and_activity":
                doc_id = entry.idempotency_key.replace(":", "_")
                if payload.get("notification"):
                    n = payload["notification"]
                    user_ref.collection("notifications").document(doc_id).set(
                        {
                            "title": n["title"],
                            "message": n["message"],
                            "type": n["type"],
                            "read": False,
                            "createdAt": admin_firestore.SERVER_TIMESTAMP,
                            "relatedEntityId": n.get("relatedEntityId"),
                            "deepLink": n.get("deepLink"),
                        },
                        merge=True,
                    )
                if payload.get("activity"):
                    a = payload["activity"]
                    user_ref.collection("activity").document(doc_id).set(
                        {
                            "type": a["type"],
                            "title": a["title"],
                            "description": a["description"],
                            "createdAt": admin_firestore.SERVER_TIMESTAMP,
                            "relatedEntityId": a.get("relatedEntityId"),
                            "metadata": a.get("metadata") or {},
                        },
                        merge=True,
                    )
            entry.status = "dispatched"
            entry.attempts += 1
            entry.last_error = None
            entry.dispatched_at = utc_now()
            self.db.flush()
            return True
        except Exception as exc:
            logger.warning("Outbox dispatch failed (%s): %s", entry.idempotency_key, type(exc).__name__)
            entry.status = "failed"
            entry.attempts += 1
            entry.last_error = f"{type(exc).__name__}: {str(exc)[:200]}"
            self.db.flush()
            return False

    def dispatch_pending_for_user(self, firebase_uid: str, limit: int = 10) -> None:
        rows = list(
            self.db.scalars(
                select(SyncOutbox)
                .where(SyncOutbox.status.in_(["pending", "failed"]))
                .order_by(SyncOutbox.created_at.asc())
                .limit(limit)
            )
        )
        for row in rows:
            if row.payload.get("firebase_uid") == firebase_uid:
                self.dispatch_outbox_entry(row)

    def get_preferences(self, firebase_uid: str) -> UserPreferencesOut:
        client = get_firestore_client()
        if client is None:
            return UserPreferencesOut(firestoreAvailable=False)
        try:
            snap = (
                client.collection("users")
                .document(firebase_uid)
                .collection("settings")
                .document("preferences")
                .get()
            )
            if not snap.exists:
                return UserPreferencesOut(firestoreAvailable=True)
            data = snap.to_dict() or {}
            return UserPreferencesOut(
                preferredUnits=data.get("preferredUnits", "metric"),
                preferredMapStyle=data.get("preferredMapStyle", "standard"),
                preferredRouteSettings=data.get("preferredRouteSettings", {}),
                preferredNotificationSettings=data.get("preferredNotificationSettings", {}),
                updatedAt=_to_datetime(data.get("updatedAt")),
                firestoreAvailable=True,
            )
        except Exception as exc:
            logger.warning("Failed to read Firestore preferences: %s", type(exc).__name__)
            return UserPreferencesOut(firestoreAvailable=False)

    def update_preferences(
        self, firebase_uid: str, prefs: UserPreferencesIn
    ) -> UserPreferencesOut:
        client = get_firestore_client()
        if client is None:
            return UserPreferencesOut(**prefs.model_dump(), firestoreAvailable=False)
        try:
            doc_ref = (
                client.collection("users")
                .document(firebase_uid)
                .collection("settings")
                .document("preferences")
            )
            payload = prefs.model_dump()
            payload["updatedAt"] = admin_firestore.SERVER_TIMESTAMP
            doc_ref.set(payload, merge=True)
            return UserPreferencesOut(
                **prefs.model_dump(), updatedAt=utc_now(), firestoreAvailable=True
            )
        except Exception as exc:
            logger.warning("Failed to update Firestore preferences: %s", type(exc).__name__)
            return UserPreferencesOut(**prefs.model_dump(), firestoreAvailable=False)

    def list_notifications(
        self,
        firebase_uid: str,
        *,
        unread_only: bool = False,
        limit: int = 20,
        cursor: str | None = None,
    ) -> NotificationListOut:
        client = get_firestore_client()
        if client is None:
            return NotificationListOut(items=[], firestoreAvailable=False)
        try:
            col = client.collection("users").document(firebase_uid).collection("notifications")
            query = col.where("read", "==", False) if unread_only else col
            query = query.order_by("createdAt", direction=admin_firestore.Query.DESCENDING)
            if cursor:
                cursor_snap = col.document(cursor).get()
                if cursor_snap.exists:
                    query = query.start_after(cursor_snap)
            docs = list(query.limit(limit + 1).stream())
            has_more = len(docs) > limit
            docs = docs[:limit]
            items = []
            for d in docs:
                data = d.to_dict() or {}
                items.append(
                    NotificationOut(
                        id=d.id,
                        title=data.get("title", ""),
                        message=data.get("message", ""),
                        type=data.get("type", "system"),
                        read=bool(data.get("read", False)),
                        createdAt=_to_datetime(data.get("createdAt")),
                        relatedEntityId=data.get("relatedEntityId"),
                        deepLink=data.get("deepLink"),
                    )
                )
            next_cursor = docs[-1].id if has_more and docs else None
            return NotificationListOut(items=items, nextCursor=next_cursor, firestoreAvailable=True)
        except Exception as exc:
            logger.warning("Failed to list Firestore notifications: %s", type(exc).__name__)
            return NotificationListOut(items=[], firestoreAvailable=False)

    def mark_notification_read(
        self, firebase_uid: str, notification_id: str, read: bool
    ) -> NotificationOut | None:
        client = get_firestore_client()
        if client is None:
            return None
        doc_ref = (
            client.collection("users")
            .document(firebase_uid)
            .collection("notifications")
            .document(notification_id)
        )
        snap = doc_ref.get()
        if not snap.exists:
            return None
        doc_ref.update({"read": read})
        data = snap.to_dict() or {}
        return NotificationOut(
            id=snap.id,
            title=data.get("title", ""),
            message=data.get("message", ""),
            type=data.get("type", "system"),
            read=read,
            createdAt=_to_datetime(data.get("createdAt")),
            relatedEntityId=data.get("relatedEntityId"),
            deepLink=data.get("deepLink"),
        )

    def mark_all_notifications_read(self, firebase_uid: str) -> int:
        client = get_firestore_client()
        if client is None:
            return 0
        try:
            col = client.collection("users").document(firebase_uid).collection("notifications")
            unread_docs = list(col.where("read", "==", False).limit(200).stream())
            if not unread_docs:
                return 0
            batch = client.batch()
            for doc in unread_docs:
                batch.update(doc.reference, {"read": True})
            batch.commit()
            return len(unread_docs)
        except Exception as exc:
            logger.warning("Failed to mark all notifications read: %s", type(exc).__name__)
            return 0

    def list_activity(
        self, firebase_uid: str, *, limit: int = 20, cursor: str | None = None
    ) -> ActivityListOut:
        client = get_firestore_client()
        if client is None:
            return ActivityListOut(items=[], firestoreAvailable=False)
        try:
            col = client.collection("users").document(firebase_uid).collection("activity")
            query = col.order_by("createdAt", direction=admin_firestore.Query.DESCENDING)
            if cursor:
                cursor_snap = col.document(cursor).get()
                if cursor_snap.exists:
                    query = query.start_after(cursor_snap)
            docs = list(query.limit(limit + 1).stream())
            has_more = len(docs) > limit
            docs = docs[:limit]
            items = []
            for d in docs:
                data = d.to_dict() or {}
                items.append(
                    ActivityOut(
                        id=d.id,
                        type=data.get("type", "event"),
                        title=data.get("title", ""),
                        description=data.get("description", ""),
                        createdAt=_to_datetime(data.get("createdAt")),
                        relatedEntityId=data.get("relatedEntityId"),
                        metadata=data.get("metadata") or {},
                    )
                )
            next_cursor = docs[-1].id if has_more and docs else None
            return ActivityListOut(items=items, nextCursor=next_cursor, firestoreAvailable=True)
        except Exception as exc:
            logger.warning("Failed to list Firestore activity: %s", type(exc).__name__)
            return ActivityListOut(items=[], firestoreAvailable=False)

    def delete_user_documents(self, firebase_uid: str) -> None:
        client = get_firestore_client()
        if client is None:
            return
        try:
            user_ref = client.collection("users").document(firebase_uid)
            for sub in ["notifications", "activity", "settings", "tripUpdates"]:
                docs = list(user_ref.collection(sub).limit(200).stream())
                if docs:
                    batch = client.batch()
                    for doc in docs:
                        batch.delete(doc.reference)
                    batch.commit()
            user_ref.delete()
        except Exception as exc:
            logger.warning("Failed deleting Firestore user docs: %s", type(exc).__name__)
