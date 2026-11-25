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
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[36px] sm:py-[55px] space-y-[48px]">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] items-center">
        <div className="lg:col-span-6 space-y-[20px]">
          <span className="cw-pill cw-pill-accent">
            Karnataka EV Intelligence · Mysuru → Mangaluru Corridor
          </span>
          <h1 className="text-[42px] sm:text-[54px] font-semibold tracking-tight text-[#121317] leading-[1.06] m-0">
            Plan EV journeys across Karnataka with verified charging trust.
          </h1>
          <p className="text-[16px] leading-[24px] text-[#45474D] m-0 max-w-[540px]">
            ChargeWise replaces range anxiety and unverified maps with connector-aware routing,
            Western Ghats elevation energy math, family-friendly stop amenities, and transparent station provenance.
          </p>
          <div className="flex flex-wrap items-center gap-[10px] pt-[6px]">
            <Link to="/plan" className="cw-btn-primary">
              <span>Plan Mysuru → Mangaluru</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/stations" className="cw-btn-secondary">
              <Compass size={16} aria-hidden="true" />
              <span>Explore Karnataka Stations</span>
            </Link>
          </div>
          <p className="text-[13px] text-[#6A6A71] m-0">
            Honest telemetry: when live CPO availability or station pricing cannot be independently verified, ChargeWise tells you directly.
          </p>
        </div>

        <div className="lg:col-span-6 cw-card p-[16px] space-y-[12px]">
          <div className="flex items-center justify-between gap-[10px]">
            <div>
              <p className="text-[13px] font-medium text-[#121317] m-0">
                Live Karnataka Station Map
              </p>
              <p className="text-[11px] text-[#6A6A71] m-0">
                Showing {stations.length} mapped stations across Mysuru, Kodagu, Dakshina Kannada & Bengaluru
              </p>
            </div>
            <Link to="/stations" className="cw-pill hover:border-[#121317]">
              Full Explorer
            </Link>
          </div>
          <StationMap stations={stations} center={[12.58, 75.85]} zoom={8} height="340px" />
        </div>
      </section>

      {/* Value Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div className="cw-card p-[24px] space-y-[10px]">
          <Zap size={20} color="#121317" aria-hidden="true" />
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">
            Deterministic Energy & Ghat Modeling
          </h2>
          <p className="text-[15px] text-[#45474D] m-0">
            Accounts for usable kWh, connector compatibility, CCCV charging taper, and Western Ghats climb vs regenerative descent.
          </p>
        </div>
        <div className="cw-card p-[24px] space-y-[10px]">
          <ShieldCheck size={20} color="#121317" aria-hidden="true" />
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">
            6-State Verification Policy
          </h2>
          <p className="text-[15px] text-[#45474D] m-0">
            Distinguishes listed registry entries from operational verified stations. Unknown status is never labeled available.
          </p>
        </div>
        <div className="cw-card p-[24px] space-y-[10px]">
          <CheckCircle2 size={20} color="#121317" aria-hidden="true" />
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">
            Family Amenities & Operator Handoff
          </h2>
          <p className="text-[15px] text-[#45474D] m-0">
            Discover restaurants, restrooms, cafes, and hospitals near chargers plus verified Play Store, App Store, and support links.
          </p>
        </div>
      </section>

      {/* Demonstration Corridor */}
      <section className="cw-card-highlight p-[24px] sm:p-[36px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-[20px]">
        <div className="space-y-[8px] max-w-[680px]">
          <p className="text-[13px] font-medium text-[#121317] m-0">
            Primary Demonstration Route
          </p>
          <h2 className="text-[28px] font-semibold text-[#121317] m-0">
            Mysuru → Kushalnagar → Madikeri → Puttur → Mangaluru
          </h2>
          <p className="text-[15px] text-[#121317] m-0">
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
