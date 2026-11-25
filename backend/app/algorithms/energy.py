from dataclasses import dataclass


@dataclass
class ChargeEstimate:
    minutes: int
    energy_delivered_to_battery_kwh: float
    average_effective_kw: float
    used_charging_curve: bool
    assumption_note: str


def compute_leg_energy_kwh(
    *,
    distance_km: float,
    consumption_kwh_per_100km: float,
    elevation_gain_m: float = 0.0,
    elevation_loss_m: float = 0.0,
    vehicle_mass_kg: float = 1900.0,
) -> float:
    """
    Deterministic physics-informed leg consumption:
      E_base = distance_km * (consumption_kwh_per_100km / 100)
      E_climb = (m * g * gain_m) / (3.6e6 * 0.85)
      E_regen = (m * g * loss_m) / 3.6e6 * 0.45  (conservative Ghat regen)
    """
    base = distance_km * (consumption_kwh_per_100km / 100.0)
    g = 9.81
    climb_kwh = (vehicle_mass_kg * g * max(0.0, elevation_gain_m)) / (3_600_000.0 * 0.85)
    regen_kwh = ((vehicle_mass_kg * g * max(0.0, elevation_loss_m)) / 3_600_000.0) * 0.45
    net = max(base * 0.55, base + climb_kwh - regen_kwh)
    return round(net, 3)


def _curve_power_at_soc(soc_pct: float, peak_kw: float, curve: list[dict] | None) -> float:
    if curve:
        pts = sorted(
            [(float(p["soc_pct"]), float(p["power_kw"])) for p in curve if "soc_pct" in p and "power_kw" in p],
            key=lambda x: x[0],
        )
        if pts:
            if soc_pct <= pts[0][0]:
                return min(peak_kw, pts[0][1])
            if soc_pct >= pts[-1][0]:
                return min(peak_kw, pts[-1][1])
            for i in range(len(pts) - 1):
                s0, p0 = pts[i]
                s1, p1 = pts[i + 1]
                if s0 <= soc_pct <= s1 and s1 > s0:
                    ratio = (soc_pct - s0) / (s1 - s0)
                    return min(peak_kw, p0 + ratio * (p1 - p0))

    # Realistic 4-zone CCCV taper fallback (never flat max-power 0->100%)
    if soc_pct < 55.0:
        return peak_kw * 0.94
    if soc_pct < 80.0:
        return peak_kw * 0.68
    if soc_pct < 92.0:
        return peak_kw * 0.34
    return peak_kw * 0.16


def estimate_charging_duration(
    *,
    usable_battery_kwh: float,
    from_soc_pct: float,
    to_soc_pct: float,
    peak_effective_kw: float,
    charging_curve: list[dict] | None = None,
    efficiency: float = 0.92,
    session_overhead_minutes: int = 4,
) -> ChargeEstimate:
    """Integrate charging time in 2% SOC slices with CCCV taper & session overhead."""
    if to_soc_pct <= from_soc_pct or peak_effective_kw <= 0:
        return ChargeEstimate(0, 0.0, 0.0, bool(charging_curve), "No charging needed.")

    delta_pct = to_soc_pct - from_soc_pct
    total_energy = usable_battery_kwh * (delta_pct / 100.0)
    steps = max(1, int(round(delta_pct / 2.0)))
    step_pct = delta_pct / steps
    step_kwh = usable_battery_kwh * (step_pct / 100.0)

    total_hours = 0.0
    for i in range(steps):
        mid_soc = from_soc_pct + (i + 0.5) * step_pct
        p_kw = max(1.5, _curve_power_at_soc(mid_soc, peak_effective_kw, charging_curve))
        # Divide by efficiency so grid draw overhead lengthens session realistically
        total_hours += (step_kwh / efficiency) / p_kw

    minutes = int(round(total_hours * 60.0)) + session_overhead_minutes
    avg_kw = total_energy / max(total_hours, 1e-4)
    note = (
        "Estimated using vehicle charging curve with 92% efficiency and 4 min plug-in overhead."
        if charging_curve
        else "Estimated using a multi-stage CCCV taper curve (94% under 55% SOC, 68% from 55–80%, 34% from 80–92%) because an OEM charging curve was unavailable."
    )
    return ChargeEstimate(
        minutes=minutes,
        energy_delivered_to_battery_kwh=round(total_energy, 2),
        average_effective_kw=round(avg_kw, 1),
        used_charging_curve=bool(charging_curve),
        assumption_note=note,
    )
