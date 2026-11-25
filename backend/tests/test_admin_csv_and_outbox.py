from unittest.mock import patch

from sqlalchemy import delete

from app.models.amenity import Amenity
from app.models.station import ChargingStation, StationSourceRecord
from app.models.system import AuditLog
from tests.conftest import make_token


def test_admin_csv_import_verification_and_analytics(client, db_session, cleanup_test_users):
    admin_uid = "test-uid-admin-csv-009"
    cleanup_test_users.append(admin_uid)
    admin_tok = make_token(admin_uid, "admincsv@example.com", role="admin")

    csv_payload = (
        "name,operator,address,city,district,latitude,longitude,connector_type,power_kw,source_id\n"
        "Test Mysuru Solar Hub,Zeon,Ring Road,Mysuru,Mysuru,12.3350,76.6200,CCS2,60,csv_test_001\n"
    )

    try:
        with patch("app.core.dependencies.verify_firebase_id_token", return_value=admin_tok):
            imp = client.post(
                "/api/v1/admin/import-csv?source_name=pytest_csv",
                headers={"Authorization": "Bearer adm"},
                files={"file": ("stations.csv", csv_payload, "text/csv")},
            )
            assert imp.status_code == 200
            res = imp.json()
            assert res["created_stations"] == 1
            assert res["errors"] == []

            # Duplicate import of same source_id must skip idempotently
            imp2 = client.post(
                "/api/v1/admin/import-csv?source_name=pytest_csv",
                headers={"Authorization": "Bearer adm"},
                files={"file": ("stations.csv", csv_payload, "text/csv")},
            )
            assert imp2.status_code == 200
            assert imp2.json()["skipped_duplicates"] == 1

            # Verify station and inspect audit log
            st_list = client.get("/api/v1/stations?q=Test+Mysuru+Solar+Hub").json()
            assert st_list["total"] == 1
            st_id = st_list["items"][0]["id"]

            ver = client.post(
                f"/api/v1/admin/stations/{st_id}/verify",
                headers={"Authorization": "Bearer adm"},
                json={"verification_status": "location_verified", "notes": "GPS verified"},
            )
            assert ver.status_code == 200
            assert ver.json()["verification_status"] == "location_verified"

            logs = client.get("/api/v1/admin/audit-logs", headers={"Authorization": "Bearer adm"})
            assert logs.status_code == 200
            assert any(l["action"] == "station.verify" for l in logs.json())

        analytics = client.get("/api/v1/analytics/overview")
        assert analytics.status_code == 200
        ov = analytics.json()
        assert ov["total_stations"] >= 15
        assert len(ov["stations_by_district"]) >= 2
    finally:
        db_session.execute(
            delete(StationSourceRecord).where(StationSourceRecord.source_name == "pytest_csv")
        )
        db_session.execute(
            delete(ChargingStation).where(ChargingStation.source == "pytest_csv")
        )
        db_session.commit()
