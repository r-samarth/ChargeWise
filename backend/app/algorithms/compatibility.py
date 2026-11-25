from dataclasses import dataclass

from app.models.station import ChargingConnector, ChargingStation
from app.models.vehicle import Vehicle


@dataclass
class CompatibleConnectorMatch:
    connector: ChargingConnector
    rated_power_kw: float
    effective_power_kw: float
    power_estimated: bool


def match_best_connector(
    vehicle: Vehicle,
    station: ChargingStation,
    *,
    prefer_fast_dc: bool = True,
) -> CompatibleConnectorMatch | None:
    """Return the highest-throughput compatible operational connector for this vehicle."""
    if not station.is_active or station.verification_status == "temporarily_unavailable":
        return None

    vehicle_connectors = {c.strip().upper() for c in (vehicle.connector_types or [])}
    best: CompatibleConnectorMatch | None = None

    for conn in station.connectors:
        c_type = conn.connector_type.strip().upper()
        if c_type not in vehicle_connectors:
            continue
        if conn.operational_status in {"out_of_service", "maintenance"}:
            continue
        if conn.availability_status == "unavailable":
            continue

        is_dc = conn.current_type.upper() == "DC" or c_type in {"CCS2", "CHADEMO", "BHARAT_DC_001"}
        veh_cap = float(vehicle.max_dc_power_kw if is_dc else vehicle.max_ac_power_kw)
        if veh_cap <= 0:
            continue

        power_estimated = conn.power_kw is None
        rated_kw = float(conn.power_kw) if conn.power_kw is not None else (25.0 if is_dc else 7.2)
        eff_kw = min(rated_kw, veh_cap)

        score = eff_kw + (500.0 if (prefer_fast_dc and is_dc) else 0.0)
        if best is None:
            best = CompatibleConnectorMatch(conn, rated_kw, eff_kw, power_estimated)
        else:
            best_is_dc = best.connector.current_type.upper() == "DC"
            best_score = best.effective_power_kw + (500.0 if (prefer_fast_dc and best_is_dc) else 0.0)
            if score > best_score:
                best = CompatibleConnectorMatch(conn, rated_kw, eff_kw, power_estimated)

    return best
