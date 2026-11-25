import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import admin, analytics, notifications, stations, trips, users, vehicles
from app.core.config import get_settings
from app.core.firebase import get_firebase_app, get_firestore_client
from app.core.security import enforce_rate_limit
from app.database.session import check_database_health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("chargewise")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        get_firebase_app(settings)
    except Exception as exc:
        logger.warning("Firebase Admin init deferred or failed: %s", type(exc).__name__)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Karnataka EV Charging Intelligence & Smart Trip Planner API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Also allow unique Vercel deployment URLs for this project. These URLs
    # change on each deployment and are distinct from the stable production alias.
    allow_origin_regex=r"^https://frontend-691q-[a-z0-9]+-samarth-r18s-projects\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server exception: %s", type(exc).__name__)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please retry."},
    )


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    pg_ok, postgis_ok, db_err = check_database_health()
    fs_ok = get_firestore_client(settings) is not None
    return {
        "status": "ok" if (pg_ok and postgis_ok) else "degraded",
        "postgres": pg_ok,
        "postgis": postgis_ok,
        "firestore_client": fs_ok,
        "db_error": db_err,
        "environment": settings.app_env,
    }


api_deps = [Depends(enforce_rate_limit)]
app.include_router(users.router, prefix="/api/v1", dependencies=api_deps)
app.include_router(vehicles.router, prefix="/api/v1", dependencies=api_deps)
app.include_router(stations.router, prefix="/api/v1", dependencies=api_deps)
app.include_router(trips.router, prefix="/api/v1", dependencies=api_deps)
app.include_router(notifications.router, prefix="/api/v1", dependencies=api_deps)
app.include_router(analytics.router, prefix="/api/v1", dependencies=api_deps)
app.include_router(admin.router, prefix="/api/v1", dependencies=api_deps)
