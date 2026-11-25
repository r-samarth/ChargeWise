import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, ExternalLink, MapPin, Navigation, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusAlert } from "../components/StatusAlert";
import { TripRouteMap } from "../components/TripRouteMap";
import { AvailabilityBadge, VerificationBadge } from "../components/VerificationBadge";
import { apiRequest } from "../lib/api";
import { useTripStore } from "../store/tripStore";
import type { TripPlanResponse } from "../types/api";

export function TripResultsPage() {
  const { id } = useParams();
  const isPreview = id === "preview";
  const lastPlanned = useTripStore((s) => s.lastPlannedTrip);
  const qc = useQueryClient();

  const { data: fetchedTrip, isLoading, error } = useQuery({
    queryKey: ["trip-detail", id],
    queryFn: () => apiRequest<TripPlanResponse>(`/trips/${id}`, { authRequired: true }),
    enabled: Boolean(id) && !isPreview,
  });

  const trip = isPreview ? lastPlanned : fetchedTrip;

  const toggleSaveMut = useMutation({
    mutationFn: (nextSaved: boolean) =>
      apiRequest(`/trips/${trip?.id}`, {
        method: "PATCH",
        authRequired: true,
        body: { is_saved: nextSaved },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip-detail", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
  });

  if (isLoading && !isPreview) {
    return (
      <div className="max-w-[1200px] mx-auto px-[16px] py-[48px]">
        <div className="cw-card p-[24px] text-[#45474D]">Loading route itinerary...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-[900px] mx-auto px-[16px] py-[48px] space-y-[16px]">
        <StatusAlert
          title="Trip itinerary unavailable"
          message={
            (error as Error)?.message ||
            "No trip preview found. Plan a route from the Trip Planner."
          }
          variant="error"
        />
        <Link to="/plan" className="cw-btn-primary">
          Back to Trip Planner
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="cw-pill cw-pill-accent">
              {trip.routing_source === "osrm_live"
                ? "Live OSRM Road Routing"
                : "Deterministic Corridor Fallback"}
            </span>
            {trip.elevation_adjusted && (
              <span className="cw-pill cw-pill-verified">Ghat Elevation Adjusted</span>
            )}
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            {trip.title}
          </h1>
          <p className="text-[15px] text-[#475569]">{trip.explanation_summary}</p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          {trip.id && (
            <button
              type="button"
              disabled={toggleSaveMut.isPending}
              onClick={() => toggleSaveMut.mutate(!trip.is_saved)}
              className={trip.is_saved ? "cw-btn-primary" : "cw-btn-secondary"}
            >
              <BookmarkCheck size={16} aria-hidden="true" />
              <span>{trip.is_saved ? "Saved Journey" : "Save Journey"}</span>
            </button>
          )}
          <Link to="/plan" className="cw-btn-secondary">
            Adjust Plan
          </Link>
        </div>
      </div>

      {!trip.feasible && (
        <StatusAlert
          title="No safe charging plan found"
          message={
            trip.failure_reason ||
            "Your current battery and connector settings cannot reach the destination safely."
          }
          variant="error"
          action={
            <Link to="/plan" className="cw-btn-primary">
              Adjust Start SOC or Stops
            </Link>
          }
        />
      )}

      {/* Key Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="cw-card p-4">
          <p className="text-[12px] font-medium text-[#64748B]">Total Distance</p>
          <p className="text-[24px] font-bold text-[#0F172A] mt-1 cw-num">
            {trip.total_distance_km} km
          </p>
        </div>
        <div className="cw-card p-4">
          <p className="text-[12px] font-medium text-[#64748B]">Est. Drive + Charge</p>
          <p className="text-[24px] font-bold text-[#0F172A] mt-1 cw-num">
            {Math.floor(trip.total_trip_minutes / 60)}h {trip.total_trip_minutes % 60}m
          </p>
          <p className="text-[12px] text-[#475569] cw-num mt-0.5">
            ({trip.estimated_charge_minutes} min charging est.)
          </p>
        </div>
        <div className="cw-card p-4">
          <p className="text-[12px] font-medium text-[#64748B]">Energy Required</p>
          <p className="text-[24px] font-bold text-[#1D4ED8] mt-1 cw-num">
            {trip.total_energy_kwh} kWh
          </p>
        </div>
        <div className="cw-card p-4">
          <p className="text-[12px] font-medium text-[#64748B]">Est. Arrival SOC</p>
          <p className="text-[24px] font-bold text-[#0F766E] mt-1 cw-num">
            {trip.arrival_soc_pct}%
          </p>
          <p className="text-[12px] text-[#475569] cw-num mt-0.5">
            ~{trip.remaining_range_km} km range left
          </p>
        </div>
        <div className="cw-card p-4">
          <p className="text-[12px] font-medium text-[#64748B]">Charging Stops</p>
          <p className="text-[24px] font-bold text-[#0F172A] mt-1 cw-num">
            {trip.stops.length}
          </p>
        </div>
      </section>

      {/* Map + SOC Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 cw-card p-4 space-y-2.5">
          <h2 className="text-[16px] font-bold text-[#0F172A] px-1">Corridor Route Map</h2>
          <TripRouteMap trip={trip} height="400px" />
        </div>

        <div className="lg:col-span-5 cw-card p-5 space-y-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#0F172A]">
              Battery SOC Progression (%)
            </h2>
            <p className="text-[13px] text-[#64748B]">
              Sawtooth jumps show planned fast-charging top-ups along the route.
            </p>
          </div>
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <AreaChart data={trip.soc_profile}>
                <defs>
                  <linearGradient id="cwSocGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.34} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.25)" strokeDasharray="3 3" />
                <XAxis dataKey="distance_km" tick={{ fontSize: 11, fill: "#475569" }} unit=" km" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#475569" }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.94)",
                    borderColor: "rgba(191, 219, 254, 0.85)",
                    borderRadius: "16px",
                    fontSize: "13px",
                    boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="soc_pct"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fill="url(#cwSocGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charging Stops Breakdown */}
      <section className="space-y-4">
        <h2 className="text-[22px] font-bold text-[#0F172A]">
          Recommended Charging Stops
        </h2>

        {trip.stops.length === 0 && trip.feasible ? (
          <div className="cw-card p-5">
            <p className="text-[15px] text-[#0F172A]">
              No mandatory stop needed — your EV can complete this trip directly while staying above your {trip.target_arrival_soc_pct}% arrival target.
            </p>
          </div>
        ) : (
          trip.stops.map((stop) => (
            <article key={stop.stop_order} className="cw-card p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3.5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="cw-pill cw-pill-accent cw-num">Stop #{stop.stop_order}</span>
                    <VerificationBadge status={stop.verification_status} />
                    <AvailabilityBadge status={stop.availability_status} />
                  </div>
                  <h3 className="text-[20px] font-bold text-[#0F172A]">
                    {stop.station_name}
                  </h3>
                  <p className="text-[13px] font-medium text-[#475569] cw-num">
                    {stop.city}, {stop.district} · {stop.distance_from_origin_km} km from origin ({stop.detour_km} km detour)
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {stop.station_id && (
                    <Link
                      to={`/stations/${stop.station_id}`}
                      className="cw-btn-secondary !py-1.5 !px-3.5"
                    >
                      Station Details
                    </Link>
                  )}
                  <a
                    href={stop.navigation_url}
                    target="_blank"
                    rel="noreferrer"
                    className="cw-btn-primary !py-1.5 !px-3.5"
                  >
                    <Navigation size={14} aria-hidden="true" />
                    <span>Navigate</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 cw-card-muted p-4 text-[13px]">
                <div>
                  <span className="text-[#64748B] block text-[12px]">Arrive → Depart SOC</span>
                  <strong className="text-[#0F172A] cw-num">
                    {stop.arrival_soc_pct}% → {stop.departure_soc_pct}%
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[12px]">Est. Charging Time</span>
                  <strong className="text-[#1D4ED8] cw-num">~{stop.estimated_charge_minutes} min</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[12px]">Energy Added</span>
                  <strong className="text-[#0F766E] cw-num">+{stop.energy_added_kwh} kWh</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[12px]">Connector & Rate</span>
                  <strong className="text-[#0F172A] cw-num">
                    {stop.connector_type} · {stop.effective_power_kw} kW (station {stop.rated_power_kw} kW)
                  </strong>
                </div>
              </div>

              <p className="text-[14px] text-[#334155]">
                <strong className="text-[#0F172A]">Why recommended:</strong> {stop.selection_reason}
              </p>

              {/* Official Operator Links */}
              {stop.operator && (
                <div className="border-t border-slate-200/75 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#0F172A]">
                      Operator: {stop.operator.name}
                    </p>
                    <p className="text-[#64748B]">
                      Open the official app and search for “{stop.station_name}” to view live bay status or pay.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {stop.operator.android_app_url && (
                      <a
                        href={stop.operator.android_app_url}
                        target="_blank"
                        rel="noreferrer"
                        className="cw-btn-secondary !py-1.5 !px-3"
                      >
                        <ExternalLink size={13} aria-hidden="true" />
                        <span>Android App</span>
                      </a>
                    )}
                    {stop.operator.ios_app_url && (
                      <a
                        href={stop.operator.ios_app_url}
                        target="_blank"
                        rel="noreferrer"
                        className="cw-btn-secondary !py-1.5 !px-3"
                      >
                        <ExternalLink size={13} aria-hidden="true" />
                        <span>iOS App</span>
                      </a>
                    )}
                    {stop.operator.support_phone && (
                      <a
                        href={`tel:${stop.operator.support_phone}`}
                        className="cw-btn-secondary !py-1.5 !px-3 cw-num"
                      >
                        <Phone size={13} aria-hidden="true" />
                        <span>{stop.operator.support_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Family-Friendly Amenities Nearby */}
              <div className="border-t border-slate-200/75 pt-3.5 space-y-2.5">
                <p className="text-[13px] font-semibold text-[#0F172A]">
                  Family-Friendly Facilities Nearby
                </p>
                {stop.nearby_amenities.length === 0 ? (
                  <p className="text-[13px] text-[#64748B]">
                    Information unavailable for nearby facilities at this stop.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {stop.nearby_amenities.map((am) => (
                      <div key={am.id} className="cw-card-muted p-3 text-[13px] space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-[#0F172A] font-semibold">{am.name}</strong>
                          <span className="cw-pill cw-pill-accent">{am.category}</span>
                        </div>
                        <p className="text-[#475569] cw-num">
                          {am.distance_km !== null ? `${am.distance_km} km away` : "Nearby"} · Hours:{" "}
                          {am.opening_hours || "Information unavailable"}
                        </p>
                        <p className="text-[#64748B] cw-num">
                          Rating: {am.rating !== null ? `${am.rating} / 5` : "Information unavailable"}
                        </p>
                        {am.navigation_url && (
                          <a
                            href={am.navigation_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#1D4ED8] hover:underline"
                          >
                            <MapPin size={12} aria-hidden="true" />
                            <span>Directions</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alternative Stops */}
              {stop.alternatives.length > 0 && (
                <div className="border-t border-slate-200/75 pt-3.5">
                  <p className="text-[13px] font-semibold text-[#0F172A] mb-2">
                    Alternative compatible corridor stations nearby:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stop.alternatives.map((alt) => (
                      <Link
                        key={alt.station_id}
                        to={`/stations/${alt.station_id}`}
                        className="cw-pill hover:border-[#2563EB] hover:text-[#1D4ED8] transition-colors cw-num"
                      >
                        {alt.name} ({alt.power_kw} kW · {alt.city})
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </section>

      {/* Transparent Assumptions & Limitations */}
      <section className="cw-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-[16px] font-bold text-[#0F172A] mb-2">
            Calculation Assumptions (Estimated)
          </h2>
          <ul className="pl-5 m-0 space-y-1.5 text-[13.5px] text-[#475569] leading-relaxed">
            {trip.assumptions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-[#0F172A] mb-2">
            Data Limitations & Safety Notes
          </h2>
          <ul className="pl-5 m-0 space-y-1.5 text-[13.5px] text-[#475569] leading-relaxed">
            {trip.limitations.map((l, idx) => (
              <li key={idx}>{l}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
