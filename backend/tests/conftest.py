import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.firebase import DecodedFirebaseToken
from app.database.session import SessionLocal
from app.main import app
from app.models.system import AuditLog, SyncOutbox
from app.models.trip import Trip
from app.models.user import User
from app.models.vehicle import Vehicle


@pytest.fixture()
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


def make_token(uid: str, email: str, role: str = "user", name: str = "Test Driver") -> DecodedFirebaseToken:
    return DecodedFirebaseToken(
        uid=uid,
        email=email,
        email_verified=True,
        display_name=name,
        role=role,
        claims={"uid": uid, "email": email, "role": role},
    )


@pytest.fixture()
def cleanup_test_users(db_session):
    uids: list[str] = []
    yield uids
    if uids:
        users = list(db_session.query(User).filter(User.firebase_uid.in_(uids)).all())
        user_ids = [u.id for u in users]
        if user_ids:
            db_session.execute(delete(AuditLog).where(AuditLog.actor_user_id.in_(user_ids)))
            db_session.execute(delete(Trip).where(Trip.user_id.in_(user_ids)))
            db_session.execute(delete(Vehicle).where(Vehicle.user_id.in_(user_ids)))
        for uid in uids:
            db_session.execute(
                delete(SyncOutbox).where(SyncOutbox.idempotency_key.like(f"%{uid}%"))
            )
        db_session.execute(delete(User).where(User.firebase_uid.in_(uids)))
        db_session.commit()
