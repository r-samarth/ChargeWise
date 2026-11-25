import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StationMap } from "../components/StationMap";
import { StatusAlert } from "../components/StatusAlert";
import { AvailabilityBadge, VerificationBadge } from "../components/VerificationBadge";
import { apiRequest } from "../lib/api";
import type { Operator, StationList } from "../types/api";

export function StationsExplorerPage() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [operator, setOperator] = useState("");
  const [connectorType, setConnectorType] = useState("");
  const [minPower, setMinPower] = useState("");
  const [verification, setVerification] = useState("");
  const [page, setPage] = useState(1);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => apiRequest<Operator[]>("/operators"),
  });

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (district) queryParams.set("district", district);
  if (operator) queryParams.set("operator", operator);
  if (connectorType) queryParams.set("connector_type", connectorType);
  if (minPower) queryParams.set("min_power_kw", minPower);
  if (verification) queryParams.set("verification_status", verification);
  queryParams.set("page", String(page));
  queryParams.set("page_size", "24");

  const { data, isLoading, error } = useQuery({
    queryKey: ["stations", queryParams.toString()],
    queryFn: () => apiRequest<StationList>(`/stations?${queryParams.toString()}`),
  });

  const stations = data?.items || [];

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div>
        <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#121317] m-0">
          Karnataka Charging Station Explorer
        </h1>
        <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
          Filter by district, operator, connector standard, and verification trust level.
        </p>
      </div>

      {/* Filters */}
      <section className="cw-card p-[20px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-[12px]">
        <div className="lg:col-span-2 relative">
          <label htmlFor="station-search" className="sr-only">
            Search stations
          </label>
          <input
            id="station-search"
            className="cw-input pl-[36px]"
            placeholder="Search city, station, or address..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <Search
            size={16}
            className="absolute left-[12px] top-[14px] text-[#6A6A71]"
            aria-hidden="true"
          />
        </div>

        <select
          aria-label="Filter by district"
          className="cw-input"
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Districts</option>
          <option value="Mysuru">Mysuru</option>
          <option value="Kodagu">Kodagu</option>
          <option value="Dakshina Kannada">Dakshina Kannada</option>
          <option value="Hassan">Hassan</option>
          <option value="Bengaluru Urban">Bengaluru Urban</option>
          <option value="Belagavi">Belagavi</option>
        </select>

        <select
          aria-label="Filter by operator"
          className="cw-input"
          value={operator}
          onChange={(e) => {
            setOperator(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Operators</option>
          {operators.map((op) => (
            <option key={op.id} value={op.slug}>
              {op.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by connector type"
          className="cw-input"
          value={connectorType}
          onChange={(e) => {
            setConnectorType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Connectors</option>
          <option value="CCS2">CCS2 (DC Fast)</option>
          <option value="TYPE_2">Type 2 (AC)</option>
          <option value="ATHER_PROPRIETARY">Ather 2W</option>
          <option value="CHADEMO">CHAdeMO</option>
        </select>

        <select
          aria-label="Filter by verification status"
          className="cw-input"
          value={verification}
          onChange={(e) => {
            setVerification(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Any Verification</option>
          <option value="operational_status_verified">Operational Verified</option>
          <option value="location_verified">Location Verified</option>
          <option value="listed">Listed (Unverified)</option>
        </select>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-[10px]">
        <p className="text-[13px] text-[#45474D] m-0">
          {data ? `Showing ${stations.length} of ${data.total} matching stations` : "Loading..."}
        </p>
        <div className="flex items-center gap-[8px]">
          <label htmlFor="minPower" className="text-[13px] text-[#45474D]">
            Min kW:
          </label>
          <select
            id="minPower"
            className="cw-input w-auto py-[6px]"
            value={minPower}
            onChange={(e) => {
              setMinPower(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Any</option>
            <option value="22">22+ kW</option>
            <option value="50">50+ kW</option>
            <option value="60">60+ kW</option>
          </select>
        </div>
      </div>

      {error && (
        <StatusAlert
          title="Could not load stations"
          message={(error as Error).message}
          variant="error"
        />
      )}

      {/* Map */}
      <div className="cw-card p-[14px]">
        <StationMap stations={stations} center={[12.82, 76.1]} zoom={7} height="420px" />
      </div>

      {/* Station Cards */}
      {isLoading ? (
        <div className="cw-card p-[24px] text-[#45474D]">Loading stations...</div>
      ) : stations.length === 0 ? (
        <div className="cw-card p-[36px] text-center">
          <p className="text-[15px] text-[#45474D] m-0">
            No stations matched your filters. Try clearing connector or district filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
          {stations.map((s) => (
            <article key={s.id} className="cw-card p-[20px] flex flex-col justify-between gap-[14px]">
              <div className="space-y-[8px]">
                <div className="flex flex-wrap gap-[6px]">
                  <VerificationBadge status={s.verification_status} />
                  <AvailabilityBadge
                    status={s.connectors[0]?.availability_status || "unknown"}
                  />
                </div>
                <h2 className="text-[18px] font-semibold text-[#121317] m-0">{s.name}</h2>
                <p className="text-[13px] text-[#45474D] m-0">
                  {s.operator?.name || "Independent"} · {s.city}, {s.district}
                </p>
                <p className="text-[13px] text-[#6A6A71] m-0 line-clamp-2">{s.address}</p>
                <div className="flex flex-wrap gap-[6px] pt-[4px]">
                  {s.connectors.map((c) => (
                    <span key={c.id} className="cw-pill">
                      {c.connector_type}{" "}
                      {c.power_kw ? `· ${c.power_kw} kW` : "· Power unknown"}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-[8px] pt-[10px] border-t border-[#E6EAF0]">
                <span className="text-[11px] text-[#6A6A71]">
                  {s.pricing_verified && s.pricing_info ? s.pricing_info : "Pricing unverified"}
                </span>
                <Link to={`/stations/${s.id}`} className="cw-btn-primary py-[6px] px-[14px]">
                  Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.total > data.page_size && (
        <div className="flex items-center justify-center gap-[12px]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="cw-btn-secondary"
          >
            Previous
          </button>
          <span className="text-[13px] text-[#45474D]">
            Page {page} of {Math.ceil(data.total / data.page_size)}
          </span>
          <button
            type="button"
            disabled={page * data.page_size >= data.total}
            onClick={() => setPage((p) => p + 1)}
            className="cw-btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
