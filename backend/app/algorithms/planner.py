import heapq
from dataclasses import dataclass

from app.algorithms.compatibility import CompatibleConnectorMatch, match_best_connector
from app.algorithms.energy import compute_leg_energy_kwh, estimate_charging_duration
from app.integrations.elevation import segment_elevation_deltas
from app.models.amenity import Amenity
from app.models.station import ChargingStation
from app.models.vehicle import Vehicle
from app.utils.geo import haversine_km, point_to_polyline_min_distance_km


@dataclass
class CandidateStop:
    station: ChargingStation
    connector_match: CompatibleConnectorMatch
    distance_from_origin_km: float
    detour_km: float
    amenities: list[tuple[Amenity, float]]
    amenity_score: float


@dataclass
class PlannedStopDecision:
    station: ChargingStation
    connector_match: CompatibleConnectorMatch
    distance_from_origin_km: float
    detour_km: float
    arrival_soc_pct: float
    departure_soc_pct: float
    energy_added_kwh: float
    charge_minutes: int
    selection_reason: str
    amenities: list[tuple[Amenity, float]]
    alternatives: list[dict]


@dataclass
class OptimizationResult:
    feasible: bool
    failure_reason: str | None
    stops: list[PlannedStopDecision]
    arrival_soc_pct: float
    total_energy_kwh: float
    total_charge_minutes: int
    extra_detour_km: float
    explanation_summary: str
    assumptions: list[str]
    limitations: list[str]


VERIFICATION_PENALTY = {
    "live_availability_confirmed": 0.0,
    "operational_status_verified": 2.0,
    "location_verified": 8.0,
    "listed": 22.0,
    "unknown_or_stale": 35.0,
}


def plan_charging_stops(
    *,
    vehicle: Vehicle,
    total_distance_km: float,
    route_coords: list[tuple[float, float]],
    elevations_m: list[float],
    candidate_stations: list[tuple[ChargingStation, list[tuple[Amenity, float]]]],
    start_soc_pct: float,
    target_arrival_soc_pct: float,
    reserve_soc_pct: float,
    max_detour_km: float,
    max_stops: int | None,
    prefer_fast_dc: bool,
    preferred_amenities: list[str],
    include_unverified: bool,
) -> OptimizationResult:
    """
    Deterministic shortest-path graph optimizer over reachable corridor stations.
    Each node represents (station_index, stops_used); transitions enforce arrival SOC >= reserve_soc_pct
    (and >= target_arrival_soc_pct at destination).
    """
    usable_kwh = float(vehicle.usable_battery_kwh)
    consumption = float(vehicle.consumption_kwh_per_100km)
    vehicle_mass_kg = 165.0 if usable_kwh < 10.0 else 1900.0
    charging_curve = vehicle.charging_curve_json

    assumptions: list[str] = [
        f"Usable battery capacity: {usable_kwh:.1f} kWh; baseline consumption: {consumption:.1f} kWh/100 km.",
        f"Minimum safety reserve maintained at every leg arrival: {reserve_soc_pct:.0f}% SOC; target destination arrival: {target_arrival_soc_pct:.0f}% SOC.",
    ]
    limitations: list[str] = [
        "Indian CPOs do not provide open unauthenticated live-availability APIs; connector occupancy is shown as Unknown unless confirmed.",
    ]
    if elevations_m:
        assumptions.append(
            "Terrain climb/descent adjustments applied from Open-Meteo elevation profile (85% drive efficiency, conservative 45% Ghat regenerative braking recovery)."
        )
    else:
        assumptions.append("Flat-elevation energy model used (elevation telemetry unavailable).")
    if not charging_curve:
        assumptions.append(
            "OEM charging curve unavailable: charging durations use a conservative 4-zone CCCV taper (94% <55% SOC, 68% 55–80%, 34% 80–92%, 16% >92%) with 92% efficiency and 4 min handshake overhead."
        )

    # Filter & project stations onto route
    projected: list[CandidateStop] = []
    skipped_unverified = 0
    skipped_incompatible = 0

    # Calculate approximate polyline total for accurate projection ratios
    poly_km = 0.0
    for i in range(len(route_coords) - 1):
        poly_km += haversine_km(
            route_coords[i][0], route_coords[i][1], route_coords[i + 1][0], route_coords[i + 1][1]
        )
    scale = (total_distance_km / poly_km) if poly_km > 0.1 else 1.0

    for st, amens in candidate_stations:
        dist_off_km, along_poly_km = point_to_polyline_min_distance_km(
            st.latitude, st.longitude, route_coords
        )
        if dist_off_km > max_detour_km:
            continue
        if not include_unverified and st.verification_status in {"listed", "unknown_or_stale"}:
            skipped_unverified += 1
            continue
        match = match_best_connector(vehicle, st, prefer_fast_dc=prefer_fast_dc)
        if match is None:
            skipped_incompatible += 1
            continue

        route_dist_km = round(min(total_distance_km - 1.0, max(1.0, along_poly_km * scale)), 2)
        detour_roundtrip = round(dist_off_km * 2.0 * 1.15, 2)  # realistic road detour factor
        pref_set = {a.lower() for a in preferred_amenities}
        matched_cats = {a.category.lower() for a, _ in amens}
        amenity_bonus = len(pref_set & matched_cats) * 4.0 + min(3.0, len(amens) * 0.5)

        projected.append(
            CandidateStop(
                station=st,
                connector_match=match,
                distance_from_origin_km=route_dist_km,
                detour_km=detour_roundtrip,
                amenities=amens,
                amenity_score=amenity_bonus,
            )
        )

    projected.sort(key=lambda c: c.distance_from_origin_km)

    # Helper for leg energy between two route distances
    def leg_energy_pct(d0: float, d1: float, detour_km: float = 0.0) -> tuple[float, float]:
        seg_dist = max(0.0, d1 - d0) + detour_km
        r0 = d0 / max(total_distance_km, 1.0)
        r1 = d1 / max(total_distance_km, 1.0)
        gain_m, loss_m = segment_elevation_deltas(elevations_m, r0, r1)
        kwh = compute_leg_energy_kwh(
            distance_km=seg_dist,
            consumption_kwh_per_100km=consumption,
            elevation_gain_m=gain_m,
            elevation_loss_m=loss_m,
            vehicle_mass_kg=vehicle_mass_kg,
        )
        return round(kwh, 3), round((kwh / usable_kwh) * 100.0, 2)

    # Check direct 0-stop feasibility first
    direct_kwh, direct_pct = leg_energy_pct(0.0, total_distance_km, 0.0)
    direct_arrival_soc = round(start_soc_pct - direct_pct, 2)
    if direct_arrival_soc >= max(reserve_soc_pct, target_arrival_soc_pct):
        backups = [
            {
                "station_id": str(c.station.id),
                "name": c.station.name,
                "city": c.station.city,
                "distance_km": c.distance_from_origin_km,
                "power_kw": c.connector_match.effective_power_kw,
                "connector_type": c.connector_match.connector.connector_type,
            }
            for c in sorted(projected, key=lambda x: -x.connector_match.effective_power_kw)[:3]
        ]
        return OptimizationResult(
            feasible=True,
            failure_reason=None,
            stops=[],
            arrival_soc_pct=direct_arrival_soc,
            total_energy_kwh=direct_kwh,
            total_charge_minutes=0,
            extra_detour_km=0.0,
            explanation_summary=(
                f"Direct journey recommended (0 charging stops needed): starting at {start_soc_pct:.0f}% SOC, "
                f"this {total_distance_km:.1f} km trip requires {direct_kwh:.1f} kWh ({direct_pct:.1f}% battery), "
                f"arriving with ~{direct_arrival_soc:.1f}% SOC above your {target_arrival_soc_pct:.0f}% target."
                + (f" {len(backups)} compatible corridor charger(s) identified as backups." if backups else "")
            ),
            assumptions=assumptions,
            limitations=limitations,
        )

    if max_stops == 0:
        return OptimizationResult(
            feasible=False,
            failure_reason=(
                f"Insufficient battery to complete {total_distance_km:.1f} km with 0 stops: "
                f"arrival SOC would be {direct_arrival_soc:.1f}% (below {target_arrival_soc_pct:.0f}% target / {reserve_soc_pct:.0f}% safety reserve)."
            ),
            stops=[],
            arrival_soc_pct=direct_arrival_soc,
            total_energy_kwh=direct_kwh,
            total_charge_minutes=0,
            extra_detour_km=0.0,
            explanation_summary="No feasible 0-stop plan; increase start SOC or allow charging stops.",
            assumptions=assumptions,
            limitations=limitations,
        )

    if not projected:
        reason = (
            f"No compatible operational chargers found within {max_detour_km:.0f} km of the corridor for connector(s) "
            f"{', '.join(vehicle.connector_types or [])}."
        )
        if skipped_incompatible > 0 and skipped_unverified == 0:
            reason += f" ({skipped_incompatible} nearby station(s) lacked compatible connectors or operational status.)"
        elif skipped_unverified > 0:
            reason += f" ({skipped_unverified} unverified station(s) were excluded by safety filter.)"
        return OptimizationResult(
            feasible=False,
            failure_reason=reason,
            stops=[],
            arrival_soc_pct=direct_arrival_soc,
            total_energy_kwh=direct_kwh,
            total_charge_minutes=0,
            extra_detour_km=0.0,
            explanation_summary=reason,
            assumptions=assumptions,
            limitations=limitations,
        )

    # Dijkstra over graph nodes:
    # Node indices: -1 = Origin, 0..N-1 = projected stations, N = Destination
    n_st = len(projected)
    dest_idx = n_st
    max_allowed_stops = max_stops if max_stops is not None else min(6, n_st)

    # State: (cost_score, current_idx, stops_used, current_soc_pct, path_tuple)
    # path_tuple entries: (station_idx, arrival_soc, departure_soc, added_kwh, charge_min, leg_kwh)
    pq: list[tuple[float, int, int, float, tuple]] = [(0.0, -1, 0, start_soc_pct, ())]
    best_seen: dict[tuple[int, int], float] = {}

    while pq:
        cost, idx, stops_used, curr_soc, path = heapq.heappop(pq)
        if idx == dest_idx:
            # Reconstruct stops
            decisions: list[PlannedStopDecision] = []
            total_charge_min = 0
            total_detour = 0.0
            total_trip_kwh = direct_kwh

            for st_idx, arr_soc, dep_soc, add_kwh, ch_min in path:
                cand = projected[st_idx]
                total_charge_min += ch_min
                total_detour += cand.detour_km
                total_trip_kwh += round(cand.detour_km * (consumption / 100.0), 2)

                # Pick up to 2 alternative compatible stations within +/- 30 km
                alts = []
                for alt_idx, alt in enumerate(projected):
                    if alt_idx != st_idx and abs(alt.distance_from_origin_km - cand.distance_from_origin_km) <= 35.0:
                        alts.append(
                            {
                                "station_id": str(alt.station.id),
                                "name": alt.station.name,
                                "city": alt.station.city,
                                "distance_from_origin_km": alt.distance_from_origin_km,
                                "connector_type": alt.connector_match.connector.connector_type,
                                "power_kw": alt.connector_match.effective_power_kw,
                                "verification_status": alt.station.verification_status,
                            }
                        )
                alts.sort(key=lambda x: -x["power_kw"])

                amenity_names = ", ".join(a.name for a, _ in cand.amenities[:2])
                reason_parts = [
                    f"Located {cand.distance_from_origin_km:.0f} km from origin ({cand.detour_km:.1f} km round-trip detour)",
                    f"matches {cand.connector_match.connector.connector_type} at up to {cand.connector_match.effective_power_kw:.0f} kW",
                    f"verification: {cand.station.verification_status.replace('_', ' ')}",
                ]
                if amenity_names:
                    reason_parts.append(f"nearby family options: {amenity_names}")

                decisions.append(
                    PlannedStopDecision(
                        station=cand.station,
                        connector_match=cand.connector_match,
                        distance_from_origin_km=cand.distance_from_origin_km,
                        detour_km=cand.detour_km,
                        arrival_soc_pct=round(arr_soc, 1),
                        departure_soc_pct=round(dep_soc, 1),
                        energy_added_kwh=round(add_kwh, 2),
                        charge_minutes=ch_min,
                        selection_reason="; ".join(reason_parts) + ".",
                        amenities=cand.amenities,
                        alternatives=alts[:3],
                    )
                )

            summary = (
                f"Planned {len(decisions)} compatible charging stop(s) over {total_distance_km:.1f} km "
                f"(+{total_detour:.1f} km detour): total estimated charging {total_charge_min} min, "
                f"arriving at {decisions[-1].station.city if not decisions else ''} destination with ~{curr_soc:.1f}% SOC."
            )
            summary = (
                f"Planned {len(decisions)} compatible charging stop(s) along the {total_distance_km:.1f} km corridor "
                f"(+{total_detour:.1f} km detour): estimated {total_charge_min} min total charging, "
                f"arriving at destination with ~{curr_soc:.1f}% SOC."
            )
            return OptimizationResult(
                feasible=True,
                failure_reason=None,
                stops=decisions,
                arrival_soc_pct=round(curr_soc, 1),
                total_energy_kwh=round(total_trip_kwh, 2),
                total_charge_minutes=total_charge_min,
                extra_detour_km=round(total_detour, 2),
                explanation_summary=summary,
                assumptions=assumptions,
                limitations=limitations,
            )

        state_key = (idx, stops_used)
        if state_key in best_seen and best_seen[state_key] < cost - 1e-6:
            continue
        best_seen[state_key] = cost

        curr_dist = 0.0 if idx == -1 else projected[idx].distance_from_origin_km

        # Option A: Try reaching Destination directly from current node
        _, req_dest_pct = leg_energy_pct(curr_dist, total_distance_km, 0.0)
        if idx == -1:
            arr_dest_soc = curr_soc - req_dest_pct
            if arr_dest_soc >= max(reserve_soc_pct, target_arrival_soc_pct):
                heapq.heappush(pq, (cost, dest_idx, stops_used, arr_dest_soc, path))
        else:
            # At station idx, decide optimal charge level (minimum needed to hit target arrival SOC, capped at 90% or 96% if required)
            cand = projected[idx]
            min_dep_soc = max(curr_soc, req_dest_pct + max(reserve_soc_pct, target_arrival_soc_pct))
            if min_dep_soc <= 95.0:
                dep_soc = min(95.0, max(curr_soc, min_dep_soc))
                est = estimate_charging_duration(
                    usable_battery_kwh=usable_kwh,
                    from_soc_pct=curr_soc,
                    to_soc_pct=dep_soc,
                    peak_effective_kw=cand.connector_match.effective_power_kw,
                    charging_curve=charging_curve,
                )
                arr_dest_soc = dep_soc - req_dest_pct
                updated_path = path[:-1] + (
                    (idx, path[-1][1], dep_soc, est.energy_delivered_to_battery_kwh, est.minutes),
                )
                edge_cost = est.minutes + VERIFICATION_PENALTY.get(cand.station.verification_status, 15.0) - cand.amenity_score
                heapq.heappush(pq, (cost + edge_cost, dest_idx, stops_used, arr_dest_soc, updated_path))

        # Option B: Advance to a further charging station j > idx
        if stops_used < max_allowed_stops:
            for j in range(idx + 1, n_st):
                next_cand = projected[j]
                _, req_leg_pct = leg_energy_pct(curr_dist, next_cand.distance_from_origin_km, next_cand.detour_km / 2.0)

                if idx == -1:
                    arr_next_soc = curr_soc - req_leg_pct
                    if arr_next_soc >= reserve_soc_pct:
                        detour_min = (next_cand.detour_km / 45.0) * 60.0
                        step_cost = detour_min + 6.0  # stop overhead
                        new_path = path + ((j, arr_next_soc, arr_next_soc, 0.0, 0),)
                        heapq.heappush(pq, (cost + step_cost, j, stops_used + 1, arr_next_soc, new_path))
                else:
                    # Try charging at station idx to reach station j safely (target 80% sweet spot, or 92% if needed)
                    cand = projected[idx]
                    needed_dep = req_leg_pct + reserve_soc_pct
                    if needed_dep > 95.0:
                        continue
                    for target_cap in (80.0, 92.0):
                        dep_soc = max(curr_soc, needed_dep)
                        if dep_soc < target_cap:
                            dep_soc = target_cap
                        if dep_soc > 95.0:
                            continue
                        arr_next_soc = dep_soc - req_leg_pct
                        if arr_next_soc >= reserve_soc_pct:
                            est = estimate_charging_duration(
                                usable_battery_kwh=usable_kwh,
                                from_soc_pct=curr_soc,
                                to_soc_pct=dep_soc,
                                peak_effective_kw=cand.connector_match.effective_power_kw,
                                charging_curve=charging_curve,
                            )
                            detour_min = (next_cand.detour_km / 45.0) * 60.0
                            step_cost = (
                                est.minutes
                                + detour_min
                                + 6.0
                                + VERIFICATION_PENALTY.get(cand.station.verification_status, 15.0)
                                - cand.amenity_score
                            )
                            updated_path = path[:-1] + (
                                (idx, path[-1][1], dep_soc, est.energy_delivered_to_battery_kwh, est.minutes),
                                (j, arr_next_soc, arr_next_soc, 0.0, 0),
                            )
                            heapq.heappush(pq, (cost + step_cost, j, stops_used + 1, arr_next_soc, updated_path))
                            if needed_dep <= 80.0:
                                break

    return OptimizationResult(
        feasible=False,
        failure_reason=(
            f"No safe route exists from {start_soc_pct:.0f}% start SOC to {target_arrival_soc_pct:.0f}% arrival SOC "
            f"while preserving a {reserve_soc_pct:.0f}% reserve across compatible corridor stations."
        ),
        stops=[],
        arrival_soc_pct=direct_arrival_soc,
        total_energy_kwh=direct_kwh,
        total_charge_minutes=0,
        extra_detour_km=0.0,
        explanation_summary=(
            "Unable to satisfy safety reserve across available compatible charging stations. "
            "Try increasing starting SOC, lowering target arrival SOC, or expanding max detour."
        ),
        assumptions=assumptions,
        limitations=limitations,
    )
