"""Initial ChargeWise PostgreSQL + PostGIS schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-25
"""
from typing import Sequence, Union

from alembic import op
import geoalchemy2
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("display_name", sa.String(120), nullable=True),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("account_status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "operators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("official_website", sa.Text(), nullable=True),
        sa.Column("android_app_url", sa.Text(), nullable=True),
        sa.Column("ios_app_url", sa.Text(), nullable=True),
        sa.Column("support_phone", sa.String(120), nullable=True),
        sa.Column("support_email", sa.String(120), nullable=True),
        sa.Column("payment_information", sa.Text(), nullable=True),
        sa.Column("reservation_support", sa.String(64), nullable=False, server_default="unknown"),
        sa.Column("api_or_ocpi_information", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_operators_slug", "operators", ["slug"])

    op.create_table(
        "charging_stations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column(
            "operator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("operators.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("district", sa.String(100), nullable=False),
        sa.Column("state", sa.String(80), nullable=False, server_default="Karnataka"),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geography(geometry_type="POINT", srid=4326),
            nullable=False,
        ),
        sa.Column("charging_type", sa.String(32), nullable=False, server_default="MIXED"),
        sa.Column("opening_hours", sa.String(160), nullable=True),
        sa.Column("pricing_info", sa.Text(), nullable=True),
        sa.Column("pricing_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "amenities_summary",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("official_station_url", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(64), nullable=True),
        sa.Column("source", sa.String(120), nullable=False),
        sa.Column("source_id", sa.String(160), nullable=False),
        sa.Column("verification_status", sa.String(32), nullable=False, server_default="listed"),
        sa.Column("confidence_score", sa.Numeric(4, 3), nullable=False, server_default="0.500"),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_charging_stations_operator_id", "charging_stations", ["operator_id"])
    op.create_index("ix_charging_stations_city", "charging_stations", ["city"])
    op.create_index("ix_charging_stations_district", "charging_stations", ["district"])
    op.create_index("ix_charging_stations_state", "charging_stations", ["state"])
    op.create_index("ix_charging_stations_verification", "charging_stations", ["verification_status"])

    op.create_table(
        "charging_connectors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "station_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("charging_stations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("connector_type", sa.String(40), nullable=False),
        sa.Column("current_type", sa.String(8), nullable=False, server_default="DC"),
        sa.Column("power_kw", sa.Numeric(6, 2), nullable=True),
        sa.Column("connector_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("operational_status", sa.String(32), nullable=False, server_default="unknown"),
        sa.Column("availability_status", sa.String(32), nullable=False, server_default="unknown"),
        sa.Column("availability_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_charging_connectors_station_id", "charging_connectors", ["station_id"])
    op.create_index("ix_charging_connectors_type", "charging_connectors", ["connector_type"])

    op.create_table(
        "station_source_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "station_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("charging_stations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("source_name", sa.String(120), nullable=False),
        sa.Column("source_record_id", sa.String(160), nullable=False),
        sa.Column("raw_name", sa.Text(), nullable=True),
        sa.Column("raw_operator", sa.Text(), nullable=True),
        sa.Column("raw_address", sa.Text(), nullable=True),
        sa.Column("raw_latitude", sa.Float(), nullable=True),
        sa.Column("raw_longitude", sa.Float(), nullable=True),
        sa.Column(
            "raw_payload",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("dedupe_status", sa.String(32), nullable=False, server_default="matched"),
        sa.Column("match_score", sa.Numeric(4, 3), nullable=True),
        sa.Column("match_breakdown", postgresql.JSONB(), nullable=True),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("source_name", "source_record_id", name="uq_source_name_record_id"),
    )
    op.create_index("ix_station_source_records_station_id", "station_source_records", ["station_id"])
    op.create_index("ix_station_source_records_dedupe_status", "station_source_records", ["dedupe_status"])

    op.create_table(
        "station_verification_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "station_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("charging_stations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("previous_status", sa.String(32), nullable=True),
        sa.Column("new_status", sa.String(32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "verified_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_station_verification_logs_station_id", "station_verification_logs", ["station_id"])

    op.create_table(
        "ev_vehicle_catalog",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("manufacturer", sa.String(80), nullable=False),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("variant", sa.String(120), nullable=False),
        sa.Column("model_year", sa.Integer(), nullable=False),
        sa.Column("battery_capacity_kwh", sa.Numeric(6, 2), nullable=False),
        sa.Column("usable_battery_kwh", sa.Numeric(6, 2), nullable=False),
        sa.Column("consumption_kwh_per_100km", sa.Numeric(6, 2), nullable=False),
        sa.Column("connector_types", postgresql.JSONB(), nullable=False),
        sa.Column("max_ac_power_kw", sa.Numeric(6, 2), nullable=False),
        sa.Column("max_dc_power_kw", sa.Numeric(6, 2), nullable=False),
        sa.Column("charging_curve_json", postgresql.JSONB(), nullable=True),
        sa.Column("specs_source", sa.String(48), nullable=False, server_default="oem_verified"),
        sa.Column("specs_notes", sa.String(240), nullable=True),
    )

    op.create_table(
        "vehicles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("nickname", sa.String(100), nullable=False),
        sa.Column("manufacturer", sa.String(80), nullable=False),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("variant", sa.String(120), nullable=False),
        sa.Column("model_year", sa.Integer(), nullable=False),
        sa.Column("battery_capacity_kwh", sa.Numeric(6, 2), nullable=False),
        sa.Column("usable_battery_kwh", sa.Numeric(6, 2), nullable=False),
        sa.Column("consumption_kwh_per_100km", sa.Numeric(6, 2), nullable=False),
        sa.Column("connector_types", postgresql.JSONB(), nullable=False),
        sa.Column("max_ac_power_kw", sa.Numeric(6, 2), nullable=False),
        sa.Column("max_dc_power_kw", sa.Numeric(6, 2), nullable=False),
        sa.Column("charging_curve_json", postgresql.JSONB(), nullable=True),
        sa.Column("specs_source", sa.String(48), nullable=False, server_default="user_entered"),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("battery_capacity_kwh > 0", name="ck_vehicle_battery_positive"),
        sa.CheckConstraint(
            "usable_battery_kwh > 0 AND usable_battery_kwh <= battery_capacity_kwh",
            name="ck_vehicle_usable_lte_total",
        ),
        sa.CheckConstraint("consumption_kwh_per_100km > 0", name="ck_vehicle_consumption_positive"),
        sa.CheckConstraint("max_ac_power_kw >= 0 AND max_dc_power_kw >= 0", name="ck_vehicle_power_nonneg"),
    )
    op.create_index("ix_vehicles_user_id", "vehicles", ["user_id"])

    op.create_table(
        "amenities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(48), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column(
            "location",
            geoalchemy2.Geography(geometry_type="POINT", srid=4326),
            nullable=False,
        ),
        sa.Column("opening_hours", sa.String(160), nullable=True),
        sa.Column("rating", sa.Numeric(3, 2), nullable=True),
        sa.Column(
            "family_friendly_tags",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("source", sa.String(120), nullable=False, server_default="OpenStreetMap"),
        sa.Column("source_id", sa.String(160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_amenities_category", "amenities", ["category"])
    op.create_index("ix_amenities_city", "amenities", ["city"])

    op.create_table(
        "trips",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vehicles.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("origin_name", sa.String(160), nullable=False),
        sa.Column("origin_lat", sa.Float(), nullable=False),
        sa.Column("origin_lon", sa.Float(), nullable=False),
        sa.Column("destination_name", sa.String(160), nullable=False),
        sa.Column("destination_lat", sa.Float(), nullable=False),
        sa.Column("destination_lon", sa.Float(), nullable=False),
        sa.Column("start_soc_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("target_arrival_soc_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("max_stops", sa.Integer(), nullable=True),
        sa.Column("preferences_json", postgresql.JSONB(), nullable=False),
        sa.Column("total_distance_km", sa.Numeric(8, 2), nullable=False),
        sa.Column("estimated_drive_minutes", sa.Integer(), nullable=False),
        sa.Column("estimated_charge_minutes", sa.Integer(), nullable=False),
        sa.Column("total_energy_kwh", sa.Numeric(8, 2), nullable=False),
        sa.Column("arrival_soc_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("routing_source", sa.String(48), nullable=False, server_default="osrm_live"),
        sa.Column("route_geojson", postgresql.JSONB(), nullable=False),
        sa.Column("explanation_summary", sa.Text(), nullable=False),
        sa.Column("assumptions_json", postgresql.JSONB(), nullable=False),
        sa.Column("is_saved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(32), nullable=False, server_default="planned"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_trips_user_id", "trips", ["user_id"])
    op.create_index("ix_trips_is_saved", "trips", ["is_saved"])

    op.create_table(
        "trip_stops",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "trip_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("trips.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stop_order", sa.Integer(), nullable=False),
        sa.Column(
            "station_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("charging_stations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "connector_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("charging_connectors.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("station_name_snapshot", sa.String(200), nullable=False),
        sa.Column("distance_from_origin_km", sa.Numeric(8, 2), nullable=False),
        sa.Column("detour_km", sa.Numeric(6, 2), nullable=False, server_default="0.0"),
        sa.Column("arrival_soc_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("departure_soc_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("energy_added_kwh", sa.Numeric(7, 2), nullable=False),
        sa.Column("estimated_charge_minutes", sa.Integer(), nullable=False),
        sa.Column("estimated_power_kw", sa.Numeric(6, 2), nullable=False),
        sa.Column("selection_reason", sa.Text(), nullable=False),
        sa.Column("alternatives_json", postgresql.JSONB(), nullable=False),
        sa.Column("is_backup", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_trip_stops_trip_id", "trip_stops", ["trip_id"])

    op.create_table(
        "sync_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("aggregate_type", sa.String(48), nullable=False),
        sa.Column("aggregate_id", sa.String(128), nullable=False),
        sa.Column("target_system", sa.String(32), nullable=False, server_default="firestore"),
        sa.Column("idempotency_key", sa.String(160), nullable=False, unique=True),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_sync_outbox_status", "sync_outbox", ["status"])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(80), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", sa.String(128), nullable=False),
        sa.Column("details", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("sync_outbox")
    op.drop_table("trip_stops")
    op.drop_table("trips")
    op.drop_table("amenities")
    op.drop_table("vehicles")
    op.drop_table("ev_vehicle_catalog")
    op.drop_table("station_verification_logs")
    op.drop_table("station_source_records")
    op.drop_table("charging_connectors")
    op.drop_table("charging_stations")
    op.drop_table("operators")
    op.drop_table("users")
