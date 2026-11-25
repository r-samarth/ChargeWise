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
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <div className="flex flex-wrap items-center gap-[8px]">
            <span className="cw-pill cw-pill-accent">
              {trip.routing_source === "osrm_live"
                ? "Live OSRM Road Routing"
                : "Deterministic Corridor Fallback"}
            </span>
            {trip.elevation_adjusted && (
              <span className="cw-pill">Ghat Elevation Adjusted</span>
            )}
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#121317] mt-[8px] mb-0">
            {trip.title}
          </h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">{trip.explanation_summary}</p>
        </div>

        <div className="flex flex-wrap gap-[10px] shrink-0">
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
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-[14px]">
        <div className="cw-card p-[16px]">
          <p className="text-[11px] text-[#6A6A71] m-0">Total Distance</p>
          <p className="text-[22px] font-semibold text-[#121317] mt-[4px] mb-0">
            {trip.total_distance_km} km
          </p>
        </div>
        <div className="cw-card p-[16px]">
          <p className="text-[11px] text-[#6A6A71] m-0">Est. Drive + Charge</p>
          <p className="text-[22px] font-semibold text-[#121317] mt-[4px] mb-0">
            {Math.floor(trip.total_trip_minutes / 60)}h {trip.total_trip_minutes % 60}m
          </p>
          <p className="text-[11px] text-[#45474D] m-0">
            ({trip.estimated_charge_minutes} min charging est.)
          </p>
        </div>
        <div className="cw-card p-[16px]">
          <p className="text-[11px] text-[#6A6A71] m-0">Energy Required</p>
          <p className="text-[22px] font-semibold text-[#121317] mt-[4px] mb-0">
            {trip.total_energy_kwh} kWh
          </p>
        </div>
        <div className="cw-card p-[16px]">
          <p className="text-[11px] text-[#6A6A71] m-0">Est. Arrival SOC</p>
          <p className="text-[22px] font-semibold text-[#121317] mt-[4px] mb-0">
            {trip.arrival_soc_pct}%
          </p>
          <p className="text-[11px] text-[#45474D] m-0">
            ~{trip.remaining_range_km} km range left
          </p>
        </div>
        <div className="cw-card p-[16px]">
          <p className="text-[11px] text-[#6A6A71] m-0">Charging Stops</p>
          <p className="text-[22px] font-semibold text-[#121317] mt-[4px] mb-0">
            {trip.stops.length}
          </p>
        </div>
      </section>

      {/* Map + SOC Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px]">
        <div className="lg:col-span-7 cw-card p-[16px] space-y-[10px]">
          <h2 className="text-[16px] font-semibold text-[#121317] m-0">Corridor Route Map</h2>
          <TripRouteMap trip={trip} height="400px" />
        </div>

        <div className="lg:col-span-5 cw-card p-[20px] space-y-[12px]">
          <div>
            <h2 className="text-[16px] font-semibold text-[#121317] m-0">
              Battery SOC Progression (%)
            </h2>
            <p className="text-[13px] text-[#6A6A71] m-0">
              Sawtooth jumps show planned fast-charging top-ups along the route.
            </p>
          </div>
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <AreaChart data={trip.soc_profile}>
                <CartesianGrid stroke="#E6EAF0" strokeDasharray="3 3" />
                <XAxis dataKey="distance_km" tick={{ fontSize: 11, fill: "#45474D" }} unit=" km" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#45474D" }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E6EAF0",
                    borderRadius: "16px",
                    fontSize: "13px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="soc_pct"
                  stroke="#121317"
                  strokeWidth={2}
                  fill="#B7BFD9"
                  fillOpacity={0.45}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charging Stops Breakdown */}
      <section className="space-y-[16px]">
        <h2 className="text-[22px] font-semibold text-[#121317] m-0">
          Recommended Charging Stops
        </h2>

        {trip.stops.length === 0 && trip.feasible ? (
          <div className="cw-card p-[20px]">
            <p className="text-[15px] text-[#121317] m-0">
              No mandatory stop needed — your EV can complete this trip directly while staying above your {trip.target_arrival_soc_pct}% arrival target.
            </p>
          </div>
        ) : (
          trip.stops.map((stop) => (
            <article key={stop.stop_order} className="cw-card p-[24px] space-y-[16px]">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-[14px]">
                <div className="space-y-[6px]">
                  <div className="flex flex-wrap items-center gap-[8px]">
                    <span className="cw-pill cw-pill-verified">Stop #{stop.stop_order}</span>
                    <VerificationBadge status={stop.verification_status} />
                    <AvailabilityBadge status={stop.availability_status} />
                  </div>
                  <h3 className="text-[20px] font-semibold text-[#121317] m-0">
                    {stop.station_name}
                  </h3>
                  <p className="text-[13px] text-[#45474D] m-0">
                    {stop.city}, {stop.district} · {stop.distance_from_origin_km} km from origin ({stop.detour_km} km detour)
                  </p>
                </div>

                <div className="flex flex-wrap gap-[8px]">
                  {stop.station_id && (
                    <Link
                      to={`/stations/${stop.station_id}`}
                      className="cw-btn-secondary py-[6px] px-[12px]"
                    >
                      Station Details
                    </Link>
                  )}
                  <a
                    href={stop.navigation_url}
                    target="_blank"
                    rel="noreferrer"
                    className="cw-btn-primary py-[6px] px-[12px]"
                  >
                    <Navigation size={14} aria-hidden="true" />
                    <span>Navigate</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-[12px] cw-card-muted p-[14px] text-[13px]">
                <div>
                  <span className="text-[#6A6A71] block">Arrive → Depart SOC</span>
                  <strong className="text-[#121317]">
                    {stop.arrival_soc_pct}% → {stop.departure_soc_pct}%
                  </strong>
                </div>
                <div>
                  <span className="text-[#6A6A71] block">Est. Charging Time</span>
                  <strong className="text-[#121317]">~{stop.estimated_charge_minutes} min</strong>
                </div>
                <div>
                  <span className="text-[#6A6A71] block">Energy Added</span>
                  <strong className="text-[#121317]">+{stop.energy_added_kwh} kWh</strong>
                </div>
                <div>
                  <span className="text-[#6A6A71] block">Connector & Rate</span>
                  <strong className="text-[#121317]">
                    {stop.connector_type} · {stop.effective_power_kw} kW (station {stop.rated_power_kw} kW)
                  </strong>
                </div>
              </div>

              <p className="text-[14px] text-[#121317] m-0">
                <strong>Why recommended:</strong> {stop.selection_reason}
              </p>

              {/* Official Operator Links */}
              {stop.operator && (
                <div className="border-t border-[#E6EAF0] pt-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] text-[13px]">
                  <div>
                    <p className="font-medium text-[#121317] m-0">
                      Operator: {stop.operator.name}
                    </p>
                    <p className="text-[#6A6A71] m-0">
                      Open the official app and search for “{stop.station_name}” to view live bay status or pay.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-[8px]">
                    {stop.operator.android_app_url && (
                      <a
                        href={stop.operator.android_app_url}
                        target="_blank"
                        rel="noreferrer"
                        className="cw-btn-secondary py-[5px] px-[12px]"
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
                        className="cw-btn-secondary py-[5px] px-[12px]"
                      >
                        <ExternalLink size={13} aria-hidden="true" />
                        <span>iOS App</span>
                      </a>
                    )}
                    {stop.operator.support_phone && (
                      <a
                        href={`tel:${stop.operator.support_phone}`}
                        className="cw-btn-secondary py-[5px] px-[12px]"
                      >
                        <Phone size={13} aria-hidden="true" />
                        <span>{stop.operator.support_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Family-Friendly Amenities Nearby */}
              <div className="border-t border-[#E6EAF0] pt-[12px] space-y-[8px]">
                <p className="text-[13px] font-medium text-[#121317] m-0">
                  Family-Friendly Facilities Nearby
                </p>
                {stop.nearby_amenities.length === 0 ? (
                  <p className="text-[13px] text-[#6A6A71] m-0">
                    Information unavailable for nearby facilities at this stop.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]">
                    {stop.nearby_amenities.map((am) => (
                      <div key={am.id} className="cw-card-muted p-[12px] text-[13px] space-y-[4px]">
                        <div className="flex items-center justify-between gap-[6px]">
                          <strong className="text-[#121317]">{am.name}</strong>
                          <span className="cw-pill">{am.category}</span>
                        </div>
                        <p className="text-[#45474D] m-0">
                          {am.distance_km !== null ? `${am.distance_km} km away` : "Nearby"} · Hours:{" "}
                          {am.opening_hours || "Information unavailable"}
                        </p>
                        <p className="text-[#6A6A71] m-0">
                          Rating: {am.rating !== null ? `${am.rating} / 5` : "Information unavailable"}
                        </p>
                        {am.navigation_url && (
                          <a
                            href={am.navigation_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-[4px] text-[#121317] underline"
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
                <div className="border-t border-[#E6EAF0] pt-[12px]">
                  <p className="text-[13px] font-medium text-[#121317] mb-[6px] mt-0">
                    Alternative compatible corridor stations nearby:
                  </p>
                  <div className="flex flex-wrap gap-[8px]">
                    {stop.alternatives.map((alt) => (
                      <Link
                        key={alt.station_id}
                        to={`/stations/${alt.station_id}`}
                        className="cw-pill hover:border-[#121317]"
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
      <section className="cw-card p-[24px] grid grid-cols-1 md:grid-cols-2 gap-[20px]">
        <div>
          <h2 className="text-[16px] font-semibold text-[#121317] mt-0 mb-[8px]">
            Calculation Assumptions (Estimated)
          </h2>
          <ul className="pl-[18px] m-0 space-y-[6px] text-[13px] text-[#45474D]">
            {trip.assumptions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-[#121317] mt-0 mb-[8px]">
            Data Limitations & Safety Notes
          </h2>
          <ul className="pl-[18px] m-0 space-y-[6px] text-[13px] text-[#45474D]">
            {trip.limitations.map((l, idx) => (
              <li key={idx}>{l}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
