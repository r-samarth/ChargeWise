from sqlalchemy.orm import Session

from app.core.firebase import DecodedFirebaseToken, delete_firebase_user
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.user import UserUpdateIn
from app.services.firestore_service import FirestoreService


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)
        self.firestore = FirestoreService(db)

    def get_or_create_from_token(self, token: DecodedFirebaseToken) -> User:
        user = self.repo.get_by_firebase_uid(token.uid)
        if user is None:
            email = token.email or f"{token.uid}@firebase.local"
            user = User(
                firebase_uid=token.uid,
                email=email,
                display_name=token.display_name or email.split("@")[0],
                role=token.role,
                account_status="active",
            )
            self.repo.create(user)
            entry = self.firestore.enqueue_outbox(
                aggregate_type="user",
                aggregate_id=str(user.id),
                idempotency_key=f"user_init:{user.firebase_uid}",
                payload={
                    "op": "init_user",
                    "firebase_uid": user.firebase_uid,
                    "display_name": user.display_name,
                    "email": user.email,
                },
            )
            self.db.commit()
            self.db.refresh(user)
            self.firestore.dispatch_outbox_entry(entry)
            self.db.commit()
        else:
            # Keep Firebase custom claim role synchronized if upgraded via Admin SDK
            if token.role == "admin" and user.role != "admin":
                user.role = "admin"
                self.db.commit()
        return user

    def update_profile(self, user: User, data: UserUpdateIn) -> User:
        if data.display_name is not None:
            user.display_name = data.display_name.strip()
        if data.phone is not None:
            user.phone = data.phone.strip() or None
        entry = self.firestore.enqueue_outbox(
            aggregate_type="user",
            aggregate_id=str(user.id),
            idempotency_key=f"user_update:{user.firebase_uid}:{user.updated_at.isoformat()}",
            payload={
                "op": "update_user",
                "firebase_uid": user.firebase_uid,
                "display_name": user.display_name,
            },
        )
        self.db.commit()
        self.db.refresh(user)
        self.firestore.dispatch_outbox_entry(entry)
        self.db.commit()
        return user

    def delete_account(self, user: User) -> None:
        firebase_uid = user.firebase_uid
        self.repo.delete(user)
        self.db.commit()
        self.firestore.delete_user_documents(firebase_uid)
        try:
            delete_firebase_user(firebase_uid)
        except Exception:
            # Firebase user might already be deleted or emulator offline; PG & FS already purged
            pass
