from sqlalchemy.engine import make_url

from app.core.config import Settings


def test_database_url_normalization_variants():
    variants = [
        "postgres://user:pass@dpg-123.oregon-postgres.render.com/chargewise",
        "postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require",
        "  \"postgresql://user:p%40ss@host:5432/db\"  ",
        "psql 'postgresql://user:pass@ep-cool.neon.tech/neondb?sslmode=require'",
        "DATABASE_URL=postgresql://user:pass@host:5432/db",
    ]
    for raw in variants:
        cfg = Settings(database_url=raw)
        assert cfg.database_url.startswith("postgresql+psycopg://")
        parsed = make_url(cfg.database_url)
        assert parsed.drivername == "postgresql+psycopg"
