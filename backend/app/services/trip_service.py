from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.algorithms.planner import plan_charging_stops
from app.integrations.elevation import fetch_route_elevations
from app.integrations.osrm import fetch_driving_route
from app.models.trip import Trip, TripStop
from app.models.user import User
from app.repositories.station_repo import StationRepository
from app.repositories.trip_repo import TripRepository
from app.repositories.vehicle_repo import VehicleRepository
from app.schemas.station import OperatorOut
from app.schemas.trip import (
    SocProfilePoint,
    TripPlanRequestIn,
    TripPlanResponseOut,
    TripSavePatchIn,
    TripStopOut,
)
from app.services.firestore_service import FirestoreService
from app.services.station_service import serialize_amenity
from app.utils.geo import google_maps_nav_url


class TripService:
    def __init__(self, db: Session):
        self.db = db
        self.trip_repo = TripRepository(db)
        self.vehicle_repo = VehicleRepository(db)
        self.station_repo = StationRepository(db)
        self.firestore = FirestoreService(db)

    async def plan_trip(self, user: User, req: TripPlanRequestIn) -> TripPlanResponseOut:
        vehicle = self.vehicle_repo.get_by_id_for_user(req.vehicle_id, user.id)
        if vehicle is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected vehicle not found for current user.",
            )

        base_route = await fetch_driving_route(
            [(req.origin_lat, req.origin_lon), (req.destination_lat, req.destination_lon)]
        )
        elev_result = await fetch_route_elevations(base_route.coordinates)

        all_stations = self.station_repo.list_all_active_for_routing()
        station_with_amenities = [
            (
                st,
                self.station_repo.find_nearby_amenities(
                    st.latitude, st.longitude, radius_km=3.5, limit=8
                ),
            )
            for st in all_stations
        ]

        opt = plan_charging_stops(
            vehicle=vehicle,
            total_distance_km=base_route.distance_km,
            route_coords=base_route.coordinates,
            elevations_m=elev_result.elevations_m,
            candidate_stations=station_with_amenities,
            start_soc_pct=req.start_soc_pct,
            target_arrival_soc_pct=req.target_arrival_soc_pct,
            reserve_soc_pct=req.reserve_soc_pct,
            max_detour_km=req.max_detour_km,
            max_stops=req.max_stops,
            prefer_fast_dc=req.prefer_fast_dc,
            preferred_amenities=req.preferred_amenities,
            include_unverified=req.include_unverified_stations,
        )

        # Refine route geometry through selected stops when feasible and stops exist
        final_route = base_route
        if opt.feasible and opt.stops:
            waypoints = (
                [(req.origin_lat, req.origin_lon)]
                + [(s.station.latitude, s.station.longitude) for s in opt.stops]
                + [(req.destination_lat, req.destination_lon)]
            )
            refined = await fetch_driving_route(waypoints)
            if refined.routing_source == base_route.routing_source:
                final_route = refined

        total_dist_km = round(
            final_route.distance_km if final_route is not base_route else (base_route.distance_km + opt.extra_detour_km),
            2,
        )
        drive_min = final_route.duration_minutes
        if final_route is base_route and opt.extra_detour_km > 0:
            drive_min += int(round((opt.extra_detour_km / 45.0) * 60.0))

        limitations = list(opt.limitations)
        if final_route.routing_source != "osrm_live":
            limitations.append(
                "External OSRM routing was unavailable; route distance and polyline use deterministic Karnataka corridor estimation."
            )

        # Build SOC progression chart points
        soc_profile: list[SocProfilePoint] = [
            SocProfilePoint(
                label=req.origin_name,
                distance_km=0.0,
                soc_pct=round(req.start_soc_pct, 1),
                elevation_m=elev_result.elevations_m[0] if elev_result.elevations_m else None,
            )
        ]
        stops_out: list[TripStopOut] = []
        for idx, s in enumerate(opt.stops, start=1):
            ratio = s.distance_from_origin_km / max(total_dist_km, 1.0)
            elev_idx = (
                min(len(elev_result.elevations_m) - 1, max(0, int(round(ratio * (len(elev_result.elevations_m) - 1)))))
                if elev_result.elevations_m
                else None
            )
            elev_val = elev_result.elevations_m[elev_idx] if elev_idx is not None else None
            soc_profile.append(
                SocProfilePoint(
                    label=f"Arrive {s.station.city}",
                    distance_km=s.distance_from_origin_km,
                    soc_pct=s.arrival_soc_pct,
                    elevation_m=elev_val,
                )
            )
            soc_profile.append(
                SocProfilePoint(
                    label=f"Depart {s.station.city}",
                    distance_km=s.distance_from_origin_km,
                    soc_pct=s.departure_soc_pct,
                    elevation_m=elev_val,
                )
            )
            stops_out.append(
                TripStopOut(
                    stop_order=idx,
                    station_id=s.station.id,
                    connector_id=s.connector_match.connector.id,
                    station_name=s.station.name,
                    city=s.station.city,
                    district=s.station.district,
                    latitude=s.station.latitude,
                    longitude=s.station.longitude,
                    connector_type=s.connector_match.connector.connector_type,
                    rated_power_kw=s.connector_match.rated_power_kw,
                    effective_power_kw=s.connector_match.effective_power_kw,
                    verification_status=s.station.verification_status,
                    availability_status=s.connector_match.connector.availability_status,
                    distance_from_origin_km=s.distance_from_origin_km,
                    detour_km=s.detour_km,
                    arrival_soc_pct=s.arrival_soc_pct,
                    departure_soc_pct=s.departure_soc_pct,
                    energy_added_kwh=s.energy_added_kwh,
                    estimated_charge_minutes=s.charge_minutes,
                    selection_reason=s.selection_reason,
                    navigation_url=google_maps_nav_url(s.station.latitude, s.station.longitude),
                    operator=OperatorOut.model_validate(s.station.operator) if s.station.operator else None,
                    nearby_amenities=[serialize_amenity(a, distance_km=d) for a, d in s.amenities],
                    alternatives=s.alternatives,
                )
            )

        soc_profile.append(
            SocProfilePoint(
                label=req.destination_name,
                distance_km=total_dist_km,
                soc_pct=round(opt.arrival_soc_pct, 1),
                elevation_m=elev_result.elevations_m[-1] if elev_result.elevations_m else None,
            )
        )

        usable_kwh = float(vehicle.usable_battery_kwh)
        consumption = float(vehicle.consumption_kwh_per_100km)
        rem_range_km = round(max(0.0, (opt.arrival_soc_pct / 100.0) * usable_kwh / (consumption / 100.0)), 1)
        trip_title = (req.title or f"{req.origin_name} → {req.destination_name}").strip()

        saved_trip_id: UUID | None = None
        created_at = None

        if opt.feasible:
            trip = Trip(
                user_id=user.id,
                vehicle_id=vehicle.id,
                title=trip_title,
                origin_name=req.origin_name,
                origin_lat=req.origin_lat,
                origin_lon=req.origin_lon,
                destination_name=req.destination_name,
                destination_lat=req.destination_lat,
                destination_lon=req.destination_lon,
                start_soc_pct=req.start_soc_pct,
                target_arrival_soc_pct=req.target_arrival_soc_pct,
                max_stops=req.max_stops,
                preferences_json={
                    "reserve_soc_pct": req.reserve_soc_pct,
                    "max_detour_km": req.max_detour_km,
                    "prefer_fast_dc": req.prefer_fast_dc,
                    "preferred_amenities": req.preferred_amenities,
                    "elevation_adjusted": elev_result.adjusted,
                    "limitations": limitations,
                    "soc_profile": [p.model_dump() for p in soc_profile],
                },
                total_distance_km=total_dist_km,
                estimated_drive_minutes=drive_min,
                estimated_charge_minutes=opt.total_charge_minutes,
                total_energy_kwh=opt.total_energy_kwh,
                arrival_soc_pct=opt.arrival_soc_pct,
                routing_source=final_route.routing_source,
                route_geojson=final_route.geojson,
                explanation_summary=opt.explanation_summary,
                assumptions_json=opt.assumptions,
                is_saved=req.save_trip,
                status="saved" if req.save_trip else "planned",
            )
            self.trip_repo.create(trip)
            for idx, s in enumerate(opt.stops, start=1):
                stop_row = TripStop(
                    trip_id=trip.id,
                    stop_order=idx,
                    station_id=s.station.id,
                    connector_id=s.connector_match.connector.id,
                    station_name_snapshot=s.station.name,
                    distance_from_origin_km=s.distance_from_origin_km,
                    detour_km=s.detour_km,
                    arrival_soc_pct=s.arrival_soc_pct,
                    departure_soc_pct=s.departure_soc_pct,
                    energy_added_kwh=s.energy_added_kwh,
                    estimated_charge_minutes=s.charge_minutes,
                    estimated_power_kw=s.connector_match.effective_power_kw,
                    selection_reason=s.selection_reason,
                    alternatives_json=s.alternatives,
                    is_backup=False,
                )
                self.db.add(stop_row)

            outbox_entry = None
            if req.save_trip:
                outbox_entry = self.firestore.enqueue_outbox(
                    aggregate_type="trip",
                    aggregate_id=str(trip.id),
                    idempotency_key=f"trip_saved:{trip.id}",
                    payload={
                        "op": "notification_and_activity",
                        "firebase_uid": user.firebase_uid,
                        "notification": {
                            "title": f"Journey saved: {trip_title}",
                            "message": f"{total_dist_km:.0f} km planned with {len(stops_out)} stop(s); expected arrival {opt.arrival_soc_pct:.0f}% SOC.",
                            "type": "trip_saved",
                            "relatedEntityId": str(trip.id),
                            "deepLink": f"/trips/{trip.id}",
                        },
                        "activity": {
                            "type": "trip_saved",
                            "title": f"Saved trip {trip_title}",
                            "description": f"{total_dist_km:.1f} km · {len(stops_out)} charging stop(s) · {opt.total_charge_minutes} min charging est.",
                            "relatedEntityId": str(trip.id),
                            "metadata": {"distanceKm": total_dist_km, "stopsCount": len(stops_out)},
                        },
                    },
                )

            self.db.commit()
            self.db.refresh(trip)
            if outbox_entry is not None:
                self.firestore.dispatch_outbox_entry(outbox_entry)
                self.db.commit()
            saved_trip_id = trip.id
            created_at = trip.created_at

        return TripPlanResponseOut(
            id=saved_trip_id,
            feasible=opt.feasible,
            failure_reason=opt.failure_reason,
            title=trip_title,
            origin_name=req.origin_name,
            origin_lat=req.origin_lat,
            origin_lon=req.origin_lon,
            destination_name=req.destination_name,
            destination_lat=req.destination_lat,
            destination_lon=req.destination_lon,
            start_soc_pct=req.start_soc_pct,
            target_arrival_soc_pct=req.target_arrival_soc_pct,
            reserve_soc_pct=req.reserve_soc_pct,
            total_distance_km=total_dist_km,
            estimated_drive_minutes=drive_min,
            estimated_charge_minutes=opt.total_charge_minutes,
            total_trip_minutes=drive_min + opt.total_charge_minutes,
            total_energy_kwh=opt.total_energy_kwh,
            arrival_soc_pct=opt.arrival_soc_pct,
            remaining_range_km=rem_range_km,
            routing_source=final_route.routing_source,
            elevation_adjusted=elev_result.adjusted,
            route_geojson=final_route.geojson,
            explanation_summary=opt.explanation_summary,
            assumptions=opt.assumptions,
            limitations=limitations,
            stops=stops_out,
            soc_profile=soc_profile,
            is_saved=req.save_trip and opt.feasible,
            created_at=created_at,
        )

    def list_trips(self, user: User, saved_only: bool = False) -> list[Trip]:
        return self.trip_repo.list_by_user(user.id, saved_only=saved_only)

    def get_trip_detail(self, user: User, trip_id: UUID) -> TripPlanResponseOut:
        trip = self.trip_repo.get_by_id_for_user(trip_id, user.id)
        if trip is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found."
            )

        prefs = trip.preferences_json or {}
        stops_out: list[TripStopOut] = []
        for s in trip.stops:
            st = self.station_repo.get_station(s.station_id) if s.station_id else None
            amens = (
                self.station_repo.find_nearby_amenities(st.latitude, st.longitude, radius_km=3.5, limit=6)
                if st
                else []
            )
            conn = (
                next((c for c in st.connectors if c.id == s.connector_id), None)
                if st and s.connector_id
                else None
            )
            stops_out.append(
                TripStopOut(
                    id=s.id,
                    stop_order=s.stop_order,
                    station_id=s.station_id,
                    connector_id=s.connector_id,
                    station_name=st.name if st else s.station_name_snapshot,
                    city=st.city if st else None,
                    district=st.district if st else None,
                    latitude=st.latitude if st else trip.origin_lat,
                    longitude=st.longitude if st else trip.origin_lon,
                    connector_type=conn.connector_type if conn else "CCS2",
                    rated_power_kw=float(conn.power_kw) if (conn and conn.power_kw) else float(s.estimated_power_kw),
                    effective_power_kw=float(s.estimated_power_kw),
                    verification_status=st.verification_status if st else "unknown_or_stale",
                    availability_status=conn.availability_status if conn else "unknown",
                    distance_from_origin_km=float(s.distance_from_origin_km),
                    detour_km=float(s.detour_km),
                    arrival_soc_pct=float(s.arrival_soc_pct),
                    departure_soc_pct=float(s.departure_soc_pct),
                    energy_added_kwh=float(s.energy_added_kwh),
                    estimated_charge_minutes=s.estimated_charge_minutes,
                    selection_reason=s.selection_reason,
                    navigation_url=google_maps_nav_url(st.latitude, st.longitude) if st else "#",
                    operator=OperatorOut.model_validate(st.operator) if (st and st.operator) else None,
                    nearby_amenities=[serialize_amenity(a, distance_km=d) for a, d in amens],
                    alternatives=s.alternatives_json or [],
                    is_backup=s.is_backup,
                )
            )

        rem_range = 0.0
        if trip.vehicle:
            usable = float(trip.vehicle.usable_battery_kwh)
            cons = float(trip.vehicle.consumption_kwh_per_100km)
            rem_range = round((float(trip.arrival_soc_pct) / 100.0) * usable / (cons / 100.0), 1)

        return TripPlanResponseOut(
            id=trip.id,
            feasible=True,
            failure_reason=None,
            title=trip.title,
            origin_name=trip.origin_name,
            origin_lat=trip.origin_lat,
            origin_lon=trip.origin_lon,
            destination_name=trip.destination_name,
            destination_lat=trip.destination_lat,
            destination_lon=trip.destination_lon,
            start_soc_pct=float(trip.start_soc_pct),
            target_arrival_soc_pct=float(trip.target_arrival_soc_pct),
            reserve_soc_pct=float(prefs.get("reserve_soc_pct", 12.0)),
            total_distance_km=float(trip.total_distance_km),
            estimated_drive_minutes=trip.estimated_drive_minutes,
            estimated_charge_minutes=trip.estimated_charge_minutes,
            total_trip_minutes=trip.estimated_drive_minutes + trip.estimated_charge_minutes,
            total_energy_kwh=float(trip.total_energy_kwh),
            arrival_soc_pct=float(trip.arrival_soc_pct),
            remaining_range_km=rem_range,
            routing_source=trip.routing_source,
            elevation_adjusted=bool(prefs.get("elevation_adjusted", False)),
            route_geojson=trip.route_geojson,
            explanation_summary=trip.explanation_summary,
            assumptions=trip.assumptions_json or [],
            limitations=prefs.get("limitations") or [],
            stops=stops_out,
            soc_profile=[SocProfilePoint(**p) for p in prefs.get("soc_profile", [])],
            is_saved=trip.is_saved,
            created_at=trip.created_at,
        )

    def patch_trip(self, user: User, trip_id: UUID, patch: TripSavePatchIn) -> Trip:
        trip = self.trip_repo.get_by_id_for_user(trip_id, user.id)
        if trip is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        was_saved = trip.is_saved
        if patch.is_saved is not None:
            trip.is_saved = patch.is_saved
            if patch.is_saved and trip.status == "planned":
                trip.status = "saved"
        if patch.title is not None:
            trip.title = patch.title.strip()
        if patch.status is not None:
            trip.status = patch.status

        outbox_entry = None
        if not was_saved and trip.is_saved:
            outbox_entry = self.firestore.enqueue_outbox(
                aggregate_type="trip",
                aggregate_id=str(trip.id),
                idempotency_key=f"trip_saved:{trip.id}",
                payload={
                    "op": "notification_and_activity",
                    "firebase_uid": user.firebase_uid,
                    "notification": {
                        "title": f"Journey saved: {trip.title}",
                        "message": f"{float(trip.total_distance_km):.0f} km planned with {len(trip.stops)} stop(s).",
                        "type": "trip_saved",
                        "relatedEntityId": str(trip.id),
                        "deepLink": f"/trips/{trip.id}",
                    },
                    "activity": {
                        "type": "trip_saved",
                        "title": f"Saved trip {trip.title}",
                        "description": f"{float(trip.total_distance_km):.1f} km · {len(trip.stops)} charging stop(s).",
                        "relatedEntityId": str(trip.id),
                        "metadata": {"distanceKm": float(trip.total_distance_km)},
                    },
                },
            )

        self.db.commit()
        self.db.refresh(trip)
        if outbox_entry is not None:
            self.firestore.dispatch_outbox_entry(outbox_entry)
            self.db.commit()
        return trip

    def delete_trip(self, user: User, trip_id: UUID) -> None:
        trip = self.trip_repo.get_by_id_for_user(trip_id, user.id)
        if trip is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        self.trip_repo.delete(trip)
        self.db.commit()
