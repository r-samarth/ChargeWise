import json
import re
from pathlib import Path
from typing import Any

from app.services.deduplication import normalize_operator_name


def _is_inside_karnataka(lat: float, lon: float) -> bool:
    in_blr = 12.75 <= lat <= 13.20 and 77.35 <= lon <= 77.85
    in_south = 12.10 <= lat <= 13.80 and 74.65 <= lon <= 77.35
    in_central = 13.20 <= lat <= 15.80 and 74.30 <= lon <= 77.20
    in_north = 15.50 <= lat <= 17.60 and 74.30 <= lon <= 77.20
    return in_blr or in_south or in_central or in_north


def _infer_ka_city_district(lat: float, lon: float) -> tuple[str, str]:
    if 12.75 <= lat <= 13.25 and 77.35 <= lon <= 77.85:
        return "Bengaluru", "Bengaluru Urban"
    if 12.80 <= lat <= 13.06 and 74.75 <= lon <= 75.05:
        return "Mangaluru", "Dakshina Kannada"
    if 12.90 <= lat <= 13.10 and 76.00 <= lon <= 76.85:
        return "Channarayapatna / Hassan Corridor", "Hassan"
    if 15.75 <= lat <= 16.05 and 74.40 <= lon <= 74.65:
        return "Belagavi", "Belagavi"
    if 16.70 <= lat <= 17.00 and 75.50 <= lon <= 77.30:
        return "Vijayapura / Kalaburagi Region", "North Karnataka"
    return "Karnataka", "Karnataka"


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
