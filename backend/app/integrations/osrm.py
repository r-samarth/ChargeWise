import logging
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.utils.geo import haversine_km

logger = logging.getLogger(__name__)


@dataclass
class RouteGeometryResult:
    distance_km: float
    duration_minutes: int
    coordinates: list[tuple[float, float]]  # (lat, lon)
    geojson: dict[str, Any]
    routing_source: str  # "osrm_live" | "corridor_fallback"


async def fetch_driving_route(
    waypoints: list[tuple[float, float]],
) -> RouteGeometryResult:
    """
    Fetch real road route from OSRM; degrade safely to deterministic corridor fallback
    with tortuosity adjustment if OSRM is unreachable or errors.
    """
    settings = get_settings()
    coords_str = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in waypoints)
    url = f"{settings.osrm_base_url.rstrip('/')}/route/v1/driving/{coords_str}"
    params = {"overview": "full", "geometries": "geojson", "steps": "false"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                routes = data.get("routes") or []
                if data.get("code") == "Ok" and routes:
                    route = routes[0]
                    dist_km = round(float(route["distance"]) / 1000.0, 2)
                    dur_min = max(1, int(round(float(route["duration"]) / 60.0)))
                    raw_coords = route["geometry"]["coordinates"]  # [lon, lat]
                    lat_lon_coords = [(float(c[1]), float(c[0])) for c in raw_coords]
                    return RouteGeometryResult(
                        distance_km=dist_km,
                        duration_minutes=dur_min,
                        coordinates=lat_lon_coords,
                        geojson={
                            "type": "Feature",
                            "geometry": route["geometry"],
                            "properties": {"routing_source": "osrm_live"},
                        },
                        routing_source="osrm_live",
                    )
    except Exception as exc:
        logger.warning("OSRM routing unavailable, using deterministic fallback: %s", type(exc).__name__)

    # Deterministic road-tortuosity fallback
    straight_km = 0.0
    for i in range(len(waypoints) - 1):
        straight_km += haversine_km(
            waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1]
        )

    # Interpolate dense polyline points for spatial station matching
    dense_coords: list[tuple[float, float]] = []
    for i in range(len(waypoints) - 1):
        lat1, lon1 = waypoints[i]
        lat2, lon2 = waypoints[i + 1]
        seg_steps = max(4, int(haversine_km(lat1, lon1, lat2, lon2) / 5.0))
        for s in range(seg_steps):
            t = s / seg_steps
            dense_coords.append((lat1 + t * (lat2 - lat1), lon1 + t * (lon2 - lon1)))
    dense_coords.append(waypoints[-1])

    road_km = round(straight_km * 1.28, 2)
    # 52 km/h realistic average Karnataka highway/ghat speed
    dur_min = max(5, int(round((road_km / 52.0) * 60.0)))
    return RouteGeometryResult(
        distance_km=road_km,
        duration_minutes=dur_min,
        coordinates=dense_coords,
        geojson={
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[round(lon, 6), round(lat, 6)] for lat, lon in dense_coords],
            },
            "properties": {"routing_source": "corridor_fallback"},
        },
        routing_source="corridor_fallback",
    )
