import json
import re
from pathlib import Path
from typing import Any

from app.services.deduplication import normalize_operator_name
from app.utils.geo import haversine_km

_KA_DISTRICT_CENTERS: list[tuple[str, str, float, float]] = [
    ("Bengaluru", "Bengaluru Urban", 12.9768, 77.5901),
    ("Devanahalli", "Bengaluru Rural", 13.2484, 77.7134),
    ("Ramanagara", "Ramanagara", 12.7253, 77.2805),
    ("Mandya", "Mandya", 12.6369, 76.7276),
    ("Mysuru", "Mysuru", 12.3041, 76.6530),
    ("Chamarajanagar", "Chamarajanagar", 11.9544, 77.1069),
    ("Madikeri", "Kodagu", 12.4215, 75.7388),
    ("Mangaluru", "Dakshina Kannada", 12.8698, 74.8430),
    ("Udupi", "Udupi", 13.3520, 74.7870),
    ("Hassan", "Hassan", 13.0302, 76.1745),
    ("Chikkamagaluru", "Chikkamagaluru", 13.4059, 75.6388),
    ("Shivamogga", "Shivamogga", 13.9326, 75.5750),
    ("Tumakuru", "Tumakuru", 13.4193, 76.8810),
    ("Kolar", "Kolar", 13.1217, 78.1255),
    ("Chikkaballapur", "Chikkaballapur", 13.0994, 77.3887),
    ("Chitradurga", "Chitradurga", 14.3049, 76.5297),
    ("Davanagere", "Davanagere", 14.4567, 75.9073),
    ("Haveri", "Haveri", 14.7180, 75.3656),
    ("Karwar", "Uttara Kannada", 14.8122, 74.1323),
    ("Hubballi", "Dharwad", 15.3518, 75.1380),
    ("Gadag", "Gadag", 15.4167, 75.6816),
    ("Koppal", "Koppal", 15.5748, 76.3119),
    ("Hosapete", "Vijayanagara", 15.2665, 76.3872),
    ("Ballari", "Ballari", 15.3483, 76.8055),
    ("Belagavi", "Belagavi", 15.8783, 74.5158),
    ("Bagalkot", "Bagalkot", 16.2904, 75.5916),
    ("Vijayapura", "Vijayapura", 16.8144, 75.8934),
    ("Raichur", "Raichur", 16.0547, 76.9004),
    ("Yadgir", "Yadgir", 16.5744, 76.9254),
    ("Kalaburagi", "Kalaburagi", 17.2409, 76.7697),
    ("Bidar", "Bidar", 18.0207, 77.2487),
]


def _is_inside_karnataka(lat: float, lon: float) -> bool:
    in_blr = 12.75 <= lat <= 13.20 and 77.35 <= lon <= 77.85
    in_south = 11.75 <= lat <= 13.80 and 74.65 <= lon <= 77.35
    in_central = 13.20 <= lat <= 15.80 and 74.10 <= lon <= 77.20
    in_north = 15.50 <= lat <= 18.30 and 74.10 <= lon <= 77.50
    return in_blr or in_south or in_central or in_north


def _infer_ka_city_district(lat: float, lon: float) -> tuple[str, str]:
    best = min(
        _KA_DISTRICT_CENTERS,
        key=lambda entry: haversine_km(lat, lon, entry[2], entry[3]),
    )
    return best[0], best[1]


def _parse_kw(raw: str | None) -> float | None:
    if not raw:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", str(raw))
    return float(m.group(1)) if m else None


def load_karnataka_osm_stations(raw_path: Path) -> list[dict[str, Any]]:
    if not raw_path.exists():
        return []
    data = json.loads(raw_path.read_text(encoding="utf-8"))
    results: list[dict[str, Any]] = []
    for el in data.get("elements", []):
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lon is None or not _is_inside_karnataka(float(lat), float(lon)):
            continue
        tags = el.get("tags", {})
        op_raw = tags.get("operator") or tags.get("network") or tags.get("brand")
        op_slug = normalize_operator_name(op_raw) if op_raw else None
        name = tags.get("name") or (f"{op_raw} Station" if op_raw else f"OSM Charging Point #{el['id']}")
        city, district = _infer_ka_city_district(float(lat), float(lon))
        city = tags.get("addr:city") or city
        district = tags.get("addr:district") or district
        addr_parts = [tags.get("addr:street"), tags.get("addr:suburb"), city, "Karnataka"]
        address = tags.get("addr:full") or ", ".join(p for p in addr_parts if p)

        connectors: list[dict[str, Any]] = []
        is_swap_or_2w = (
            tags.get("battery_swapping") == "yes"
            or tags.get("charging_station:battery_swapping") == "yes"
            or op_slug in {"ather", "honda-eswap", "yulu"}
            or (tags.get("scooter") == "yes" and tags.get("motorcar") != "yes")
        )
        if tags.get("socket:type2_combo") or tags.get("socket:ccs"):
            connectors.append(
                {
                    "connector_type": "CCS2",
                    "current_type": "DC",
                    "power_kw": _parse_kw(tags.get("socket:type2_combo:output") or tags.get("socket:ccs:output") or tags.get("charging_station:output")),
                    "connector_count": int(tags.get("socket:type2_combo") or 1) if str(tags.get("socket:type2_combo", "")).isdigit() else 1,
                }
            )
        if tags.get("socket:type2"):
            connectors.append(
                {
                    "connector_type": "TYPE_2",
                    "current_type": "AC",
                    "power_kw": _parse_kw(tags.get("socket:type2:output")),
                    "connector_count": int(tags.get("socket:type2") or 1) if str(tags.get("socket:type2", "")).isdigit() else 1,
                }
            )
        if tags.get("socket:chademo"):
            connectors.append(
                {
                    "connector_type": "CHADEMO",
                    "current_type": "DC",
                    "power_kw": _parse_kw(tags.get("socket:chademo:output")),
                    "connector_count": 1,
                }
            )
        if not connectors:
            if op_slug == "ather":
                connectors.append({"connector_type": "ATHER_PROPRIETARY", "current_type": "DC", "power_kw": 3.0, "connector_count": 1})
            else:
                connectors.append({"connector_type": "UNKNOWN", "current_type": "AC" if is_swap_or_2w else "DC", "power_kw": None, "connector_count": 1})

        results.append(
            {
                "name": name,
                "operator_slug": op_slug,
                "raw_operator": op_raw,
                "address": address,
                "city": city,
                "district": district,
                "state": "Karnataka",
                "latitude": float(lat),
                "longitude": float(lon),
                "charging_type": "SWAP_OR_2W" if is_swap_or_2w else ("DC_FAST" if any(c["current_type"] == "DC" for c in connectors) else "AC"),
                "opening_hours": tags.get("opening_hours"),
                "pricing_info": tags.get("charge"),
                "pricing_verified": bool(tags.get("charge")),
                "official_station_url": tags.get("website"),
                "source": "OpenStreetMap (Overpass)",
                "source_id": f"osm:{el['type']}:{el['id']}",
                "verification_status": "listed",
                "confidence_score": 0.62 if op_raw else 0.45,
                "connectors": connectors,
                "raw_payload": el,
            }
        )
    return results
