"""Promote a user to admin in both Firebase Auth custom claims and PostgreSQL."""
import argparse
import sys
from pathlib import Path

from firebase_admin import auth as fb_auth
from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.core.firebase import get_firebase_app  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--uid", required=True, help="Firebase UID to promote to admin")
    args = parser.parse_args()

    app = get_firebase_app()
    fb_auth.set_custom_user_claims(args.uid, {"role": "admin"}, app=app)

    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.firebase_uid == args.uid))
        if user is not None:
            user.role = "admin"
            db.commit()
            print(f"Updated PostgreSQL & Firebase claims for {args.uid} -> admin")
        else:
            print(f"Set Firebase admin claim for {args.uid}. PG user row will inherit role on first login.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
