import logging
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class ElevationSampleResult:
    elevations_m: list[float]
    adjusted: bool


async def fetch_route_elevations(
    coordinates: list[tuple[float, float]], sample_count: int = 24
) -> ElevationSampleResult:
    """Sample route coordinates and query Open-Meteo Elevation API with safe fallback."""
    if not coordinates:
        return ElevationSampleResult([], False)

    if len(coordinates) <= sample_count:
        sampled = coordinates
    else:
        step = (len(coordinates) - 1) / (sample_count - 1)
        sampled = [coordinates[int(round(i * step))] for i in range(sample_count)]

    lats = ",".join(f"{pt[0]:.5f}" for pt in sampled)
    lons = ",".join(f"{pt[1]:.5f}" for pt in sampled)
    url = get_settings().open_meteo_elevation_url

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params={"latitude": lats, "longitude": lons})
            if resp.status_code == 200:
                data = resp.json()
                elevs = data.get("elevation")
                if isinstance(elevs, list) and len(elevs) == len(sampled):
                    return ElevationSampleResult([float(e) for e in elevs], True)
    except Exception as exc:
        logger.warning("Elevation API unavailable, using flat profile: %s", type(exc).__name__)

    return ElevationSampleResult([], False)


def segment_elevation_deltas(
    elevations_m: list[float], start_ratio: float, end_ratio: float
) -> tuple[float, float]:
    """Compute cumulative positive climb and negative descent over a fractional route slice."""
    if len(elevations_m) < 2:
        return 0.0, 0.0
    n = len(elevations_m) - 1
    i0 = max(0, min(n, int(round(start_ratio * n))))
    i1 = max(i0, min(n, int(round(end_ratio * n))))
    gain = 0.0
    loss = 0.0
    for idx in range(i0, i1):
        diff = elevations_m[idx + 1] - elevations_m[idx]
        if diff > 0:
            gain += diff
        else:
            loss += -diff
    return round(gain, 1), round(loss, 1)
