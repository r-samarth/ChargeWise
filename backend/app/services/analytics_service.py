from collections import Counter

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.operator import Operator
from app.models.station import ChargingConnector, ChargingStation
from app.schemas.admin import AnalyticsOverviewOut


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def overview(self) -> AnalyticsOverviewOut:
        stations = list(
            self.db.scalars(
                select(ChargingStation)
                .options(selectinload(ChargingStation.operator), selectinload(ChargingStation.connectors))
                .where(ChargingStation.is_active.is_(True))
            ).unique()
        )
        operators = list(self.db.scalars(select(Operator)))
        connectors = list(self.db.scalars(select(ChargingConnector)))

        district_counts = Counter(s.district for s in stations)
        operator_counts = Counter(s.operator.name if s.operator else "Independent / Unassigned" for s in stations)
        verification_counts = Counter(s.verification_status for s in stations)
        connector_counts = Counter(c.connector_type for c in connectors)

        power_buckets = {"<= 7.4 kW (AC)": 0, "11–25 kW": 0, "30–60 kW (DC)": 0, "> 60 kW (Ultra-Fast)": 0, "Unknown": 0}
        for c in connectors:
            if c.power_kw is None:
                power_buckets["Unknown"] += c.connector_count
            else:
                p = float(c.power_kw)
                if p <= 7.4:
                    power_buckets["<= 7.4 kW (AC)"] += c.connector_count
                elif p <= 25:
                    power_buckets["11–25 kW"] += c.connector_count
                elif p <= 60:
                    power_buckets["30–60 kW (DC)"] += c.connector_count
                else:
                    power_buckets["> 60 kW (Ultra-Fast)"] += c.connector_count

        return AnalyticsOverviewOut(
            total_stations=len(stations),
            total_connectors=sum(c.connector_count for c in connectors),
            total_operators=len(operators),
            stations_by_district=[
                {"district": k, "count": v} for k, v in district_counts.most_common()
            ],
            stations_by_operator=[
                {"operator": k, "count": v} for k, v in operator_counts.most_common()
            ],
            connectors_by_type=[
                {"connector_type": k, "count": v} for k, v in connector_counts.most_common()
            ],
            power_kw_distribution=[
                {"bucket": k, "count": v} for k, v in power_buckets.items() if v > 0
            ],
            verification_breakdown=[
                {"status": k, "count": v} for k, v in verification_counts.most_common()
            ],
            karnataka_ev_benchmark={
                "source": "MoRTH VAHAN & BEE Public Disclosures (2024–2026)",
                "ev_registrations_2024": 177646,
                "ev_registrations_2025_ytd_nov": 169704,
                "bengaluru_2024": 100150,
                "bengaluru_2025_ytd_nov": 91693,
                "kerc_lt6c_tariff_inr_per_kwh": 4.50,
            },
        )
