from app.models.operator import Operator
from app.models.station import ChargingStation
from app.services.deduplication import evaluate_deduplication
from app.utils.geo import wkt_point


def test_stations_list_and_postgis_nearby(client):
    res = client.get("/api/v1/stations?district=Kodagu&connector_type=CCS2")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert all(s["district"] == "Kodagu" for s in data["items"])
    # Never fabricate availability or unverified pricing
    for s in data["items"]:
        assert s["pricing_info"] is None
        for c in s["connectors"]:
            assert c["availability_status"] == "unknown"

    nearby = client.get("/api/v1/stations/nearby?lat=12.297844&lon=76.664631&radius_km=10")
    assert nearby.status_code == 200
    items = nearby.json()
    assert len(items) >= 2
    assert "Mall of Mysore" in items[0]["name"]


def test_deduplication_does_not_merge_by_proximity_alone():
    op_statiq = Operator(slug="statiq", name="Statiq")
    op_zeon = Operator(slug="zeon", name="Zeon Charging")
    existing = ChargingStation(
        name="Zeon Charging — City Centre Mall",
        operator=op_zeon,
        address="City Centre Mall, KS Rao Road, Mangaluru",
        city="Mangaluru",
        district="Dakshina Kannada",
        state="Karnataka",
        latitude=12.87142,
        longitude=74.84250,
        location=wkt_point(12.87142, 74.84250),
        source="Zeon",
        source_id="z1",
    )

    # Same coordinates (0m away) but DIFFERENT operator and DIFFERENT station name -> must NOT auto-merge!
    diff_op = evaluate_deduplication(
        name="Statiq — Hotel Roopa Basement",
        operator_name=op_statiq.name,
        address="Balmatta Road, Mangaluru",
        latitude=12.87142,
        longitude=74.84250,
        candidates=[existing],
    )
    assert diff_op.status != "matched"

    # Same coordinates, same operator, very similar name -> MUST merge!
    same_station = evaluate_deduplication(
        name="Zeon City Centre Mall Mangaluru",
        operator_name="Zeon Network",
        address="KS Rao Road, Hampankatta, Mangaluru",
        latitude=12.87145,
        longitude=74.84252,
        candidates=[existing],
    )
    assert same_station.status == "matched"
    assert same_station.score >= 0.82
