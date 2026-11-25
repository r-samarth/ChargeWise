import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Compass, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { StationMap } from "../components/StationMap";
import { apiRequest } from "../lib/api";
import type { StationList } from "../types/api";

export function LandingPage() {
  const { data: stationData } = useQuery({
    queryKey: ["landing-stations"],
    queryFn: () => apiRequest<StationList>("/stations?page_size=30"),
  });

  const stations = stationData?.items || [];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-5">
          <span className="cw-pill cw-pill-accent">
            Karnataka EV Intelligence · Mysuru → Mangaluru Corridor
          </span>
          <h1 className="text-[36px] sm:text-[50px] font-bold tracking-[-0.03em] text-[#0F172A] leading-[1.08]">
            Plan EV journeys across Karnataka with verified charging trust.
          </h1>
          <p className="text-[16px] leading-[1.6] text-[#334155] max-w-[540px]">
            ChargeWise replaces range anxiety and unverified maps with connector-aware routing,
            Western Ghats elevation energy math, family-friendly stop amenities, and transparent station provenance.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/plan" className="cw-btn-primary">
              <span>Plan Mysuru → Mangaluru</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/stations" className="cw-btn-secondary">
              <Compass size={16} aria-hidden="true" />
              <span>Explore Karnataka Stations</span>
            </Link>
          </div>
          <div className="cw-card-muted px-4 py-3 text-[13px] text-[#475569] leading-relaxed">
            Honest telemetry: when live CPO availability or station pricing cannot be independently verified, ChargeWise states it plainly.
          </div>
        </div>

        <div className="lg:col-span-6 cw-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="space-y-0.5">
              <p className="text-[14px] font-semibold text-[#0F172A]">
                Live Karnataka Station Map
              </p>
              <p className="text-[12px] text-[#64748B] cw-num">
                Showing {stations.length} mapped stations across Mysuru, Kodagu, Dakshina Kannada & Bengaluru
              </p>
            </div>
            <Link to="/stations" className="cw-pill cw-pill-accent hover:opacity-90 transition-opacity">
              Full Explorer
            </Link>
          </div>
          <StationMap stations={stations} center={[12.58, 75.85]} zoom={8} height="350px" />
        </div>
      </section>

      {/* Value Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="cw-card cw-card-interactive p-6 space-y-3">
          <span className="w-10 h-10 rounded-2xl bg-[#DBEAFE] text-[#1D4ED8] inline-flex items-center justify-center shadow-inner">
            <Zap size={20} aria-hidden="true" />
          </span>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Deterministic Energy & Ghat Modeling
          </h2>
          <p className="text-[14.5px] leading-relaxed text-[#475569]">
            Accounts for usable kWh, connector compatibility, CCCV charging taper, and Western Ghats climb vs regenerative descent.
          </p>
        </div>

        <div className="cw-card cw-card-interactive p-6 space-y-3">
          <span className="w-10 h-10 rounded-2xl bg-[#CCFBF1] text-[#0F766E] inline-flex items-center justify-center shadow-inner">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            6-State Verification Policy
          </h2>
          <p className="text-[14.5px] leading-relaxed text-[#475569]">
            Distinguishes listed registry entries from operational verified stations. Unknown status is never labeled available.
          </p>
        </div>

        <div className="cw-card cw-card-interactive p-6 space-y-3">
          <span className="w-10 h-10 rounded-2xl bg-[#E0E7FF] text-[#3730A3] inline-flex items-center justify-center shadow-inner">
            <CheckCircle2 size={20} aria-hidden="true" />
          </span>
          <h2 className="text-[18px] font-bold text-[#0F172A]">
            Family Amenities & Operator Handoff
          </h2>
          <p className="text-[14.5px] leading-relaxed text-[#475569]">
            Discover restaurants, restrooms, cafes, and hospitals near chargers plus verified Play Store, App Store, and support links.
          </p>
        </div>
      </section>

      {/* Demonstration Corridor */}
      <section className="cw-card-highlight p-6 sm:p-9 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-[700px]">
          <span className="cw-eyebrow">Primary Demonstration Route</span>
          <h2 className="text-[24px] sm:text-[28px] font-bold text-[#0F172A] leading-tight">
            Mysuru → Kushalnagar → Madikeri → Puttur → Mangaluru
          </h2>
          <p className="text-[15px] text-[#334155] leading-relaxed">
            255 km via NH-275 with verified Tata Power & Zeon DC fast chargers at Bannikuppe, Kushalnagar, Madikeri, and Puttur.
          </p>
        </div>
        <Link to="/register" className="cw-btn-primary shrink-0">
          <span>Start planning free</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
