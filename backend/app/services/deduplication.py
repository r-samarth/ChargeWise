import re
from dataclasses import dataclass
from difflib import SequenceMatcher

from app.models.station import ChargingStation
from app.utils.geo import haversine_km


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""
    cleaned = re.sub(r"[^a-z0-9\s]", " ", value.lower())
    stopwords = {"ev", "charging", "station", "charger", "point", "pvt", "ltd", "india", "network"}
    tokens = [t for t in cleaned.split() if t and t not in stopwords]
    return " ".join(tokens)


def normalize_operator_name(value: str | None) -> str:
    txt = (value or "").lower().strip()
    if "tata" in txt:
        return "tata-power"
    if "zeon" in txt:
        return "zeon"
    if "statiq" in txt:
        return "statiq"
    if "chargezone" in txt or "charge zone" in txt:
        return "chargezone"
    if "jio" in txt or "pulse" in txt:
        return "jio-bp"
    if "bescom" in txt or "mithra" in txt:
        return "bescom"
    if "ather" in txt:
        return "ather"
    if "glida" in txt or "fortum" in txt:
        return "glida"
    if "bpcl" in txt or "bharat petroleum" in txt:
        return "bpcl"
    if "hpcl" in txt or "hindustan petroleum" in txt:
        return "hpcl"
    if "kazam" in txt:
        return "kazam"
    if "relux" in txt:
        return "relux"
    if "eesl" in txt:
        return "eesl"
    if "shell" in txt:
        return "shell"
    if "ola" in txt:
        return "ola"
    if "iocl" in txt or "indian oil" in txt or "indianoil" in txt:
        return "iocl"
    if "sunfuel" in txt or "sun fuel" in txt:
        return "sunfuel"
    return _normalize_text(value)


@dataclass
class DedupeDecision:
    status: str  # "matched" | "pending_review" | "new_station"
    matched_station: ChargingStation | None
    score: float
    breakdown: dict[str, float | str | None]


def score_station_candidate(
    *,
    name: str,
    operator_name: str | None,
    address: str,
    latitude: float,
    longitude: float,
    candidate: ChargingStation,
) -> tuple[float, dict[str, float | str | None]]:
    """
    Compute multi-signal similarity score in [0.0, 1.0].
    Proximity alone NEVER merges two distinct stations (max proximity weight = 0.35).
    """
    dist_m = haversine_km(latitude, longitude, candidate.latitude, candidate.longitude) * 1000.0
    prox_score = max(0.0, 1.0 - (dist_m / 250.0))

    cand_op = normalize_operator_name(candidate.operator.name if candidate.operator else None)
    in_op = normalize_operator_name(operator_name)
    if cand_op and in_op:
        op_score = 1.0 if cand_op == in_op else 0.0
    else:
        op_score = 0.25  # Unknown operator offers neither full match nor contradiction

    norm_in_name = _normalize_text(name)
    norm_cand_name = _normalize_text(candidate.name)
    name_score = (
        SequenceMatcher(None, norm_in_name, norm_cand_name).ratio()
        if norm_in_name and norm_cand_name
        else 0.0
    )

    in_addr_tokens = set(_normalize_text(address).split())
    cand_addr_tokens = set(_normalize_text(candidate.address).split())
    if in_addr_tokens and cand_addr_tokens:
        addr_score = len(in_addr_tokens & cand_addr_tokens) / len(in_addr_tokens | cand_addr_tokens)
    else:
        addr_score = 0.0

    total = 0.35 * prox_score + 0.25 * op_score + 0.25 * name_score + 0.15 * addr_score
    breakdown = {
        "distance_meters": round(dist_m, 2),
        "proximity_score": round(prox_score, 3),
        "operator_score": round(op_score, 3),
        "name_score": round(name_score, 3),
        "address_score": round(addr_score, 3),
    }
    return round(total, 3), breakdown


def evaluate_deduplication(
    *,
    name: str,
    operator_name: str | None,
    address: str,
    latitude: float,
    longitude: float,
    candidates: list[ChargingStation],
) -> DedupeDecision:
    best_station: ChargingStation | None = None
    best_score = 0.0
    best_breakdown: dict[str, float | str | None] = {}

    for cand in candidates:
        score, breakdown = score_station_candidate(
            name=name,
            operator_name=operator_name,
            address=address,
            latitude=latitude,
            longitude=longitude,
            candidate=cand,
        )
        if score > best_score:
            best_score = score
            best_station = cand
            best_breakdown = breakdown

    if best_station is not None and best_score >= 0.82 and float(best_breakdown.get("distance_meters", 999)) <= 150.0:
        return DedupeDecision("matched", best_station, best_score, best_breakdown)
    if best_station is not None and best_score >= 0.55:
        return DedupeDecision("pending_review", best_station, best_score, best_breakdown)
    return DedupeDecision("new_station", None, best_score, best_breakdown)
