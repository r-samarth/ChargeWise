from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_health() -> tuple[bool, bool, str | None]:
    """Return (postgres_ok, postgis_ok, error_message)."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            postgis_ver = conn.execute(text("SELECT PostGIS_Version()")).scalar()
            return True, bool(postgis_ver), None
    except Exception as exc:
        return False, False, type(exc).__name__
