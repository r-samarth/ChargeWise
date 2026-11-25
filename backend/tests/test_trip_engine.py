from unittest.mock import AsyncMock, patch

from app.algorithms.energy import compute_leg_energy_kwh, estimate_charging_duration
from app.integrations.elevation import ElevationSampleResult
from app.integrations.osrm import RouteGeometryResult
from tests.conftest import make_token


def test_energy_and_cccv_taper_math():
    flat_kwh = compute_leg_energy_kwh(distance_km=100.0, consumption_kwh_per_100km=14.0)
    assert flat_kwh == 14.0

    climb_kwh = compute_leg_energy_kwh(
        distance_km=100.0,
        consumption_kwh_per_100km=14.0,
        elevation_gain_m=600.0,
        elevation_loss_m=0.0,
    )
    assert climb_kwh > flat_kwh

    fast_zone = estimate_charging_duration(
        usable_battery_kwh=42.5,
        from_soc_pct=20.0,
        to_soc_pct=50.0,
        peak_effective_kw=60.0,
    )
    taper_zone = estimate_charging_duration(
        usable_battery_kwh=42.5,
        from_soc_pct=65.0,
        to_soc_pct=95.0,
        peak_effective_kw=60.0,
    )
    # Charging 30% in the upper SOC zone MUST take noticeably longer due to CCCV taper
    assert taper_zone.minutes > fast_zone.minutes
    assert "CCCV taper" in taper_zone.assumption_note


def test_mysuru_to_mangaluru_tiago_needs_stop_and_handles_osrm_fallback(
    client, db_session, cleanup_test_users
):
    uid = "test-uid-trip-001"
    cleanup_test_users.append(uid)
    tok = make_token(uid, "tripper@example.com")

    fallback_route = RouteGeometryResult(
        distance_km=254.6,
        duration_minutes=294,
        coordinates=[
            (12.2978, 76.6646),
            (12.3115, 76.2820),
            (12.4580, 75.9590),
            (12.4244, 75.7382),
            (12.7633, 75.2018),
            (12.8714, 74.8425),
        ],
        geojson={
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [76.6646, 12.2978],
                    [76.2820, 12.3115],
                    [75.9590, 12.4580],
                    [75.7382, 12.4244],
                    [75.2018, 75.2018],
                    [74.8425, 12.8714],
                ],
            },
        },
        routing_source="corridor_fallback",
    )
    elev = ElevationSampleResult([748.0, 790.0, 860.0, 1136.0, 120.0, 27.0], True)

    with patch("app.core.dependencies.verify_firebase_id_token", return_value=tok):
        veh_resp = client.post(
            "/api/v1/vehicles",
            headers={"Authorization": "Bearer t"},
            json={
                "nickname": "City Tiago",
                "manufacturer": "Tata",
                "model": "Tiago.ev",
                "variant": "Long Range 24 kWh",
                "model_year": 2024,
                "battery_capacity_kwh": 24.0,
                "usable_battery_kwh": 22.5,
                "consumption_kwh_per_100km": 11.8,
                "connector_types": ["CCS2", "TYPE_2"],
                "max_ac_power_kw": 7.2,
                "max_dc_power_kw": 30.0,
            },
        )
        assert veh_resp.status_code == 201
        tiago_id = veh_resp.json()["id"]

        # Simulate Firestore unavailable while saving trip -> PostgreSQL persistence must still succeed!
        with (
            patch("app.services.trip_service.fetch_driving_route", AsyncMock(return_value=fallback_route)),
            patch("app.services.trip_service.fetch_route_elevations", AsyncMock(return_value=elev)),
            patch("app.services.firestore_service.get_firestore_client", return_value=None),
        ):
            plan_resp = client.post(
                "/api/v1/trips/plan",
                headers={"Authorization": "Bearer t"},
                json={
                    "vehicle_id": tiago_id,
                    "origin_name": "Mysuru",
                    "origin_lat": 12.2978,
                    "origin_lon": 76.6646,
                    "destination_name": "Mangaluru",
                    "destination_lat": 12.8714,
                    "destination_lon": 74.8425,
                    "start_soc_pct": 85.0,
                    "target_arrival_soc_pct": 25.0,
                    "reserve_soc_pct": 12.0,
                    "prefer_fast_dc": True,
                    "preferred_amenities": ["restaurant", "washroom"],
                    "save_trip": True,
                },
            )
        assert plan_resp.status_code == 200
        body = plan_resp.json()
        assert body["feasible"] is True
        assert body["routing_source"] == "corridor_fallback"
        assert body["is_saved"] is True
        assert len(body["stops"]) >= 1
        assert body["arrival_soc_pct"] >= 25.0
        # Vehicle DC cap (30 kW) must never be exceeded even at a 60 kW or 90 kW station
        for stop in body["stops"]:
            assert stop["effective_power_kw"] <= 30.0
            assert stop["connector_type"] == "CCS2"

        # Saved trip persists in PostgreSQL and is retrievable
        saved_id = body["id"]
        trips_list = client.get("/api/v1/trips?saved_only=true", headers={"Authorization": "Bearer t"})
        assert trips_list.status_code == 200
        assert any(t["id"] == saved_id for t in trips_list.json())

        # Edge case: incompatible connector (Ather scooter along NH-275 with 3.24 kWh usable)
        ather_resp = client.post(
            "/api/v1/vehicles",
            headers={"Authorization": "Bearer t"},
            json={
                "nickname": "Ather 450X",
                "manufacturer": "Ather",
                "model": "450X",
                "variant": "3.7 kWh",
                "model_year": 2024,
                "battery_capacity_kwh": 3.7,
                "usable_battery_kwh": 3.24,
                "consumption_kwh_per_100km": 3.3,
                "connector_types": ["ATHER_PROPRIETARY"],
                "max_ac_power_kw": 0.9,
                "max_dc_power_kw": 3.0,
            },
        )
        ather_id = ather_resp.json()["id"]
        with (
            patch("app.services.trip_service.fetch_driving_route", AsyncMock(return_value=fallback_route)),
            patch("app.services.trip_service.fetch_route_elevations", AsyncMock(return_value=elev)),
        ):
            incompat = client.post(
                "/api/v1/trips/plan",
                headers={"Authorization": "Bearer t"},
                json={
                    "vehicle_id": ather_id,
                    "origin_name": "Mysuru",
                    "origin_lat": 12.2978,
                    "origin_lon": 76.6646,
                    "destination_name": "Mangaluru",
                    "destination_lat": 12.8714,
                    "destination_lon": 74.8425,
                    "start_soc_pct": 85.0,
                    "target_arrival_soc_pct": 20.0,
                },
            )
        assert incompat.status_code == 200
        assert incompat.json()["feasible"] is False
        assert "No compatible" in (incompat.json()["failure_reason"] or "")
