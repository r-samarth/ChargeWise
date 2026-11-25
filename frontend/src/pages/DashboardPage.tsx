import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Car, Compass, Map as MapIcon, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import type {
  AnalyticsOverview,
  NotificationItem,
  TripSummary,
  Vehicle,
} from "../types/api";

export function DashboardPage() {
  const { profile, firebaseUser } = useAuth();

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest<Vehicle[]>("/vehicles", { authRequired: true }),
  });

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ["trips"],
    queryFn: () => apiRequest<TripSummary[]>("/trips", { authRequired: true }),
  });

  const { data: notifRes } = useQuery({
    queryKey: ["notifications-preview"],
    queryFn: () =>
      apiRequest<{ items: NotificationItem[]; firestoreAvailable: boolean }>(
        "/notifications?limit=5",
        { authRequired: true }
      ),
  });

  const { data: overview } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => apiRequest<AnalyticsOverview>("/analytics/overview"),
  });

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#121317] m-0">
            Welcome back, {profile?.display_name || firebaseUser?.email?.split("@")[0] || "Driver"}
          </h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
            Manage your electric vehicles, plan Karnataka highway trips, and check verified corridor stops.
          </p>
        </div>
        <div className="flex flex-wrap gap-[10px]">
          <Link to="/vehicles/new" className="cw-btn-secondary">
            <Plus size={16} aria-hidden="true" />
            <span>Add EV</span>
          </Link>
          <Link to="/plan" className="cw-btn-primary">
            <MapIcon size={16} aria-hidden="true" />
            <span>Plan a Trip</span>
          </Link>
        </div>
      </div>

      {firebaseUser && !firebaseUser.emailVerified && (
        <StatusAlert
          title="Verify your email address"
          message="Your account works normally, and verifying your email helps protect password recovery."
          action={
            <Link to="/verify-email" className="cw-btn-secondary">
              Verify now
            </Link>
          }
        />
      )}

      {/* Real Database Counts (Zero Fake Analytics) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px]">
        <div className="cw-card p-[20px]">
          <p className="text-[13px] text-[#6A6A71] m-0">Saved Vehicles</p>
          <p className="text-[28px] font-semibold text-[#121317] mt-[6px] mb-0">
            {loadingVehicles ? "…" : vehicles.length}
          </p>
        </div>
        <div className="cw-card p-[20px]">
          <p className="text-[13px] text-[#6A6A71] m-0">Planned Trips</p>
          <p className="text-[28px] font-semibold text-[#121317] mt-[6px] mb-0">
            {loadingTrips ? "…" : trips.length}
          </p>
        </div>
        <div className="cw-card p-[20px]">
          <p className="text-[13px] text-[#6A6A71] m-0">Active Karnataka Stations</p>
          <p className="text-[28px] font-semibold text-[#121317] mt-[6px] mb-0">
            {overview ? overview.total_stations : "…"}
          </p>
        </div>
        <div className="cw-card p-[20px]">
          <p className="text-[13px] text-[#6A6A71] m-0">Tracked Operators</p>
          <p className="text-[28px] font-semibold text-[#121317] mt-[6px] mb-0">
            {overview ? overview.total_operators : "…"}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px]">
        {/* Vehicles */}
        <section className="lg:col-span-6 cw-card p-[24px] space-y-[16px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#121317] m-0 flex items-center gap-[8px]">
              <Car size={18} aria-hidden="true" />
              <span>Your Garage</span>
            </h2>
            <Link to="/vehicles" className="text-[13px] font-medium text-[#121317] underline">
              Manage all
            </Link>
          </div>
          {loadingVehicles ? (
            <p className="text-[15px] text-[#6A6A71] m-0">Loading vehicles...</p>
          ) : vehicles.length === 0 ? (
            <div className="cw-card-muted p-[16px] space-y-[10px]">
              <p className="text-[15px] text-[#45474D] m-0">
                Add your EV (or pick a verified Tata, MG, Mahindra, or BYD template) to calculate range and compatible stops.
              </p>
              <Link to="/vehicles/new" className="cw-btn-primary">
                Add your first EV
              </Link>
            </div>
          ) : (
            <ul className="list-none p-0 m-0 space-y-[10px]">
              {vehicles.slice(0, 3).map((v) => (
                <li
                  key={v.id}
                  className="cw-card-muted p-[14px] flex items-center justify-between gap-[12px]"
                >
                  <div>
                    <p className="text-[15px] font-medium text-[#121317] m-0">
                      {v.nickname} {v.is_default ? "· Default" : ""}
                    </p>
                    <p className="text-[13px] text-[#45474D] m-0">
                      {v.manufacturer} {v.model} ({v.usable_battery_kwh} kWh usable · {v.connector_types.join(", ")})
                    </p>
                  </div>
                  <Link to={`/plan?vehicle=${v.id}`} className="cw-btn-secondary py-[6px] px-[12px]">
                    Plan
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Trips */}
        <section className="lg:col-span-6 cw-card p-[24px] space-y-[16px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-[#121317] m-0 flex items-center gap-[8px]">
              <Compass size={18} aria-hidden="true" />
              <span>Recent Trips</span>
            </h2>
            <Link to="/trip-history" className="text-[13px] font-medium text-[#121317] underline">
              Trip history
            </Link>
          </div>
          {loadingTrips ? (
            <p className="text-[15px] text-[#6A6A71] m-0">Loading trip history...</p>
          ) : trips.length === 0 ? (
            <div className="cw-card-muted p-[16px] space-y-[10px]">
              <p className="text-[15px] text-[#45474D] m-0">
                No journeys planned yet. Try the Mysuru → Mangaluru corridor demo.
              </p>
              <Link to="/plan" className="cw-btn-primary">
                <span>Launch Mysuru → Mangaluru</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="list-none p-0 m-0 space-y-[10px]">
              {trips.slice(0, 4).map((t) => (
                <li
                  key={t.id}
                  className="cw-card-muted p-[14px] flex items-center justify-between gap-[12px]"
                >
                  <div>
                    <p className="text-[15px] font-medium text-[#121317] m-0">{t.title}</p>
                    <p className="text-[13px] text-[#45474D] m-0">
                      {t.total_distance_km} km · Est. arrival {t.arrival_soc_pct}% SOC
                    </p>
                  </div>
                  <Link to={`/trips/${t.id}`} className="cw-btn-secondary py-[6px] px-[12px]">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Firestore Notifications Preview */}
      <section className="cw-card p-[24px] space-y-[14px]">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#121317] m-0 flex items-center gap-[8px]">
            <Bell size={18} aria-hidden="true" />
            <span>Notifications</span>
          </h2>
          <Link to="/notifications" className="text-[13px] font-medium text-[#121317] underline">
            Open inbox
          </Link>
        </div>
        {notifRes && !notifRes.firestoreAvailable ? (
          <p className="text-[13px] text-[#6A6A71] m-0">
            Firestore notification store is currently offline in this environment; trip and vehicle data remain safe in PostgreSQL.
          </p>
        ) : (notifRes?.items.length || 0) === 0 ? (
          <p className="text-[15px] text-[#45474D] m-0">
            No notifications yet. Saving a journey creates an activity & notification entry automatically.
          </p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-[8px]">
            {notifRes?.items.map((n) => (
              <li key={n.id} className="cw-card-muted p-[12px] flex items-center justify-between gap-[12px]">
                <div>
                  <p className="text-[14px] font-medium text-[#121317] m-0">{n.title}</p>
                  <p className="text-[13px] text-[#45474D] m-0">{n.message}</p>
                </div>
                {!n.read && <span className="cw-pill cw-pill-accent">Unread</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
