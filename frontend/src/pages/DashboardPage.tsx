import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Building2, Car, Compass, Map as MapIcon, Plus, Zap } from "lucide-react";
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
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="cw-eyebrow">Driver Workspace</span>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            Welcome back, {profile?.display_name || firebaseUser?.email?.split("@")[0] || "Driver"}
          </h1>
          <p className="text-[15px] text-[#475569]">
            Manage your electric vehicles, plan Karnataka highway trips, and check verified corridor stops.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
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

      {/* Real Database Counts */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cw-card p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-[#64748B]">Saved Vehicles</p>
            <p className="text-[30px] font-bold text-[#0F172A] mt-1 cw-num">
              {loadingVehicles ? "…" : vehicles.length}
            </p>
          </div>
          <span className="w-9 h-9 rounded-xl bg-[#DBEAFE] text-[#1D4ED8] inline-flex items-center justify-center">
            <Car size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="cw-card p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-[#64748B]">Planned Trips</p>
            <p className="text-[30px] font-bold text-[#0F172A] mt-1 cw-num">
              {loadingTrips ? "…" : trips.length}
            </p>
          </div>
          <span className="w-9 h-9 rounded-xl bg-[#E0E7FF] text-[#4338CA] inline-flex items-center justify-center">
            <Compass size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="cw-card p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-[#64748B]">Active Karnataka Stations</p>
            <p className="text-[30px] font-bold text-[#0F172A] mt-1 cw-num">
              {overview ? overview.total_stations : "…"}
            </p>
          </div>
          <span className="w-9 h-9 rounded-xl bg-[#CCFBF1] text-[#0F766E] inline-flex items-center justify-center">
            <Zap size={18} aria-hidden="true" />
          </span>
        </div>

        <div className="cw-card p-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[12.5px] font-medium text-[#64748B]">Tracked Operators</p>
            <p className="text-[30px] font-bold text-[#0F172A] mt-1 cw-num">
              {overview ? overview.total_operators : "…"}
            </p>
          </div>
          <span className="w-9 h-9 rounded-xl bg-[#F1F5F9] text-[#334155] inline-flex items-center justify-center">
            <Building2 size={18} aria-hidden="true" />
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Vehicles */}
        <section className="lg:col-span-6 cw-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold text-[#0F172A] flex items-center gap-2">
              <Car size={18} className="text-[#2563EB]" aria-hidden="true" />
              <span>Your Garage</span>
            </h2>
            <Link to="/vehicles" className="text-[13px] font-semibold text-[#1D4ED8] hover:underline">
              Manage all
            </Link>
          </div>
          {loadingVehicles ? (
            <p className="text-[14.5px] text-[#64748B]">Loading vehicles...</p>
          ) : vehicles.length === 0 ? (
            <div className="cw-card-muted p-4 space-y-3">
              <p className="text-[14.5px] text-[#334155] leading-relaxed">
                Add your EV (or pick a verified Tata, MG, Mahindra, or BYD template) to calculate range and compatible stops.
              </p>
              <Link to="/vehicles/new" className="cw-btn-primary">
                Add your first EV
              </Link>
            </div>
          ) : (
            <ul className="list-none p-0 m-0 space-y-2.5">
              {vehicles.slice(0, 3).map((v) => (
                <li
                  key={v.id}
                  className="cw-card-muted p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-semibold text-[#0F172A]">
                      {v.nickname}
                      {v.is_default ? (
                        <span className="ml-2 cw-pill cw-pill-verified">Default</span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-[#475569] cw-num">
                      {v.manufacturer} {v.model} ({v.usable_battery_kwh} kWh usable · {v.connector_types.join(", ")})
                    </p>
                  </div>
                  <Link to={`/plan?vehicle=${v.id}`} className="cw-btn-secondary !py-1.5 !px-3.5">
                    Plan
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Trips */}
        <section className="lg:col-span-6 cw-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold text-[#0F172A] flex items-center gap-2">
              <Compass size={18} className="text-[#2563EB]" aria-hidden="true" />
              <span>Recent Trips</span>
            </h2>
            <Link to="/trip-history" className="text-[13px] font-semibold text-[#1D4ED8] hover:underline">
              Trip history
            </Link>
          </div>
          {loadingTrips ? (
            <p className="text-[14.5px] text-[#64748B]">Loading trip history...</p>
          ) : trips.length === 0 ? (
            <div className="cw-card-muted p-4 space-y-3">
              <p className="text-[14.5px] text-[#334155] leading-relaxed">
                No journeys planned yet. Try the Mysuru → Mangaluru corridor demo.
              </p>
              <Link to="/plan" className="cw-btn-primary">
                <span>Launch Mysuru → Mangaluru</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="list-none p-0 m-0 space-y-2.5">
              {trips.slice(0, 4).map((t) => (
                <li
                  key={t.id}
                  className="cw-card-muted p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-semibold text-[#0F172A]">{t.title}</p>
                    <p className="text-[13px] text-[#475569] cw-num">
                      {t.total_distance_km} km · Est. arrival {t.arrival_soc_pct}% SOC
                    </p>
                  </div>
                  <Link to={`/trips/${t.id}`} className="cw-btn-secondary !py-1.5 !px-3.5">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Firestore Notifications Preview */}
      <section className="cw-card p-6 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold text-[#0F172A] flex items-center gap-2">
            <Bell size={18} className="text-[#2563EB]" aria-hidden="true" />
            <span>Notifications</span>
          </h2>
          <Link to="/notifications" className="text-[13px] font-semibold text-[#1D4ED8] hover:underline">
            Open inbox
          </Link>
        </div>
        {notifRes && !notifRes.firestoreAvailable ? (
          <p className="text-[13.5px] text-[#64748B]">
            Firestore notification store is currently offline in this environment; trip and vehicle data remain safe in PostgreSQL.
          </p>
        ) : (notifRes?.items.length || 0) === 0 ? (
          <p className="text-[14.5px] text-[#475569]">
            No notifications yet. Saving a journey creates an activity & notification entry automatically.
          </p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-2">
            {notifRes?.items.map((n) => (
              <li key={n.id} className="cw-card-muted p-3.5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-[14px] font-semibold text-[#0F172A]">{n.title}</p>
                  <p className="text-[13px] text-[#475569]">{n.message}</p>
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
