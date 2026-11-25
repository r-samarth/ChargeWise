from unittest.mock import patch

from app.core.firebase import FirebaseAuthError
from tests.conftest import make_token


def test_missing_token_rejected(client):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401


def test_invalid_expired_revoked_disabled_tokens(client):
    for code, status_code in [
        ("invalid_token", 401),
        ("token_expired", 401),
        ("token_revoked", 401),
        ("account_disabled", 403),
    ]:
        with patch(
            "app.core.dependencies.verify_firebase_id_token",
            side_effect=FirebaseAuthError(f"Error: {code}", status_code=status_code, code=code),
        ):
            resp = client.get(
                "/api/v1/users/me", headers={"Authorization": "Bearer fake-token"}
            )
            assert resp.status_code == status_code


def test_uid_ownership_and_vehicle_validation(client, cleanup_test_users):
    uid_a = "test-uid-alpha-001"
    uid_b = "test-uid-beta-002"
    cleanup_test_users.extend([uid_a, uid_b])

    token_a = make_token(uid_a, "alpha@example.com", name="Alpha Driver")
    token_b = make_token(uid_b, "beta@example.com", name="Beta Driver")

    with patch("app.core.dependencies.verify_firebase_id_token", return_value=token_a):
        me_a = client.get("/api/v1/users/me", headers={"Authorization": "Bearer tok-a"})
        assert me_a.status_code == 200
        assert me_a.json()["firebase_uid"] == uid_a

        # Invalid usable > total battery capacity rejected
        bad_veh = client.post(
            "/api/v1/vehicles",
            headers={"Authorization": "Bearer tok-a"},
            json={
                "nickname": "Invalid EV",
                "manufacturer": "Tata",
                "model": "Nexon.ev",
                "variant": "Test",
                "model_year": 2025,
                "battery_capacity_kwh": 30.0,
                "usable_battery_kwh": 45.0,
                "consumption_kwh_per_100km": 13.5,
                "connector_types": ["CCS2"],
                "max_ac_power_kw": 7.2,
                "max_dc_power_kw": 60.0,
            },
        )
        assert bad_veh.status_code == 422

        # Create valid vehicle for user A
        good_veh = client.post(
            "/api/v1/vehicles",
            headers={"Authorization": "Bearer tok-a"},
            json={
                "nickname": "Family Nexon",
                "manufacturer": "Tata",
                "model": "Nexon.ev",
                "variant": "45 kWh",
                "model_year": 2025,
                "battery_capacity_kwh": 45.0,
                "usable_battery_kwh": 42.5,
                "consumption_kwh_per_100km": 13.5,
                "connector_types": ["CCS2", "TYPE_2"],
                "max_ac_power_kw": 7.2,
                "max_dc_power_kw": 60.0,
            },
        )
        assert good_veh.status_code == 201
        veh_id = good_veh.json()["id"]

    # User B cannot read or delete User A's vehicle
    with patch("app.core.dependencies.verify_firebase_id_token", return_value=token_b):
        get_other = client.get(
            f"/api/v1/vehicles/{veh_id}", headers={"Authorization": "Bearer tok-b"}
        )
        assert get_other.status_code == 404
        del_other = client.delete(
            f"/api/v1/vehicles/{veh_id}", headers={"Authorization": "Bearer tok-b"}
        )
        assert del_other.status_code == 404


def test_admin_rbac_enforced_on_backend(client, cleanup_test_users):
    uid_user = "test-uid-ordinary-003"
    uid_admin = "test-uid-admin-004"
    cleanup_test_users.extend([uid_user, uid_admin])

    ordinary = make_token(uid_user, "user@example.com", role="user")
    admin_tok = make_token(uid_admin, "admin@example.com", role="admin")

    with patch("app.core.dependencies.verify_firebase_id_token", return_value=ordinary):
        r = client.get("/api/v1/admin/data-quality", headers={"Authorization": "Bearer u"})
        assert r.status_code == 403

    with patch("app.core.dependencies.verify_firebase_id_token", return_value=admin_tok):
        r = client.get("/api/v1/admin/data-quality", headers={"Authorization": "Bearer a"})
        assert r.status_code == 200
        assert r.json()["total_stations"] >= 15


def test_public_jwks_verification_without_service_account():
    from app.core.config import Settings
    from app.core.firebase import verify_firebase_id_token

    cfg = Settings(
        firebase_project_id="chargewise-7e46f",
        firebase_auth_emulator_host=None,
        firestore_emulator_host=None,
        firebase_service_account_json=None,
    )
    fake_claims = {
        "sub": "live-firebase-uid-123",
        "email": "driver@chargewise.in",
        "email_verified": True,
        "name": "Live Driver",
    }
    with patch("app.core.firebase.google_id_token.verify_firebase_token", return_value=fake_claims):
        decoded = verify_firebase_id_token("mock.jwt.token", settings=cfg)
        assert decoded.uid == "live-firebase-uid-123"
        assert decoded.email == "driver@chargewise.in"
        assert decoded.role == "user"
