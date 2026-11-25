import math
from typing import Iterable


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two WGS84 points in kilometers."""
    r = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def wkt_point(lat: float, lon: float) -> str:
    """EWKT point string for PostGIS Geography(Point, 4326)."""
    return f"SRID=4326;POINT({lon:.7f} {lat:.7f})"


def point_to_polyline_min_distance_km(
    lat: float, lon: float, polyline: Iterable[tuple[float, float]]
) -> tuple[float, float]:
    """Return (min_distance_km, approximate_route_km_at_closest_vertex)."""
    pts = list(polyline)
    if not pts:
        return float("inf"), 0.0

    best_dist = float("inf")
    best_along_km = 0.0
    cum_km = 0.0
    prev = pts[0]
    for idx, curr in enumerate(pts):
        if idx > 0:
            cum_km += haversine_km(prev[0], prev[1], curr[0], curr[1])
            prev = curr
        d = haversine_km(lat, lon, curr[0], curr[1])
        if d < best_dist:
            best_dist = d
            best_along_km = cum_km
    return round(best_dist, 3), round(best_along_km, 3)


def google_maps_nav_url(lat: float, lon: float) -> str:
    return f"https://www.google.com/maps/dir/?api=1&destination={lat:.6f},{lon:.6f}"
