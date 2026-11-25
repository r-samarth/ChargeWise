import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatusAlert } from "../components/StatusAlert";
import { apiRequest } from "../lib/api";
import type { AnalyticsOverview, DataQualityMetrics, Operator, StationList } from "../types/api";

interface SourceRecord {
  id: string;
  station_id: string | null;
  source_name: string;
  source_record_id: string;
  raw_name: string | null;
  raw_operator: string | null;
  dedupe_status: string;
  match_score: number | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export function AdminDashboardPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"quality" | "stations" | "import" | "duplicates" | "audit">("quality");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Station Form State
  const [stName, setStName] = useState("");
  const [stOpId, setStOpId] = useState("");
  const [stAddress, setStAddress] = useState("");
  const [stCity, setStCity] = useState("Mysuru");
  const [stDistrict, setStDistrict] = useState("Mysuru");
  const [stLat, setStLat] = useState("12.305");
  const [stLon, setStLon] = useState("76.655");
  const [stPower, setStPower] = useState("60");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const { data: quality } = useQuery({
    queryKey: ["admin-quality"],
    queryFn: () => apiRequest<DataQualityMetrics>("/admin/data-quality", { authRequired: true }),
  });

  const { data: overview } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => apiRequest<AnalyticsOverview>("/analytics/overview"),
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => apiRequest<Operator[]>("/operators"),
  });

  const { data: stationList } = useQuery({
    queryKey: ["admin-stations"],
    queryFn: () => apiRequest<StationList>("/stations?page_size=20"),
  });

  const { data: duplicates = [] } = useQuery({
    queryKey: ["admin-duplicates"],
    queryFn: () => apiRequest<SourceRecord[]>("/admin/duplicates", { authRequired: true }),
    enabled: tab === "duplicates",
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => apiRequest<AuditLog[]>("/admin/audit-logs?limit=40", { authRequired: true }),
    enabled: tab === "audit",
  });

  const createStationMut = useMutation({
    mutationFn: () =>
      apiRequest("/admin/stations", {
        method: "POST",
        authRequired: true,
        body: {
          name: stName,
          operator_id: stOpId || null,
          address: stAddress,
          city: stCity,
          district: stDistrict,
          latitude: Number(stLat),
          longitude: Number(stLon),
          charging_type: "DC_FAST",
          source: "Admin Dashboard",
          source_id: `admin:${Date.now()}`,
          verification_status: "location_verified",
          connectors: [
            {
              connector_type: "CCS2",
              current_type: "DC",
              power_kw: Number(stPower),
              connector_count: 1,
              operational_status: "operational",
              availability_status: "unknown",
            },
          ],
        },
      }),
    onSuccess: () => {
      setFeedback("Station created and audited.");
      setStName("");
      setStAddress("");
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["admin-quality"] });
    },
    onError: (e) => setErrorMsg((e as Error).message),
  });

  const verifyMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/admin/stations/${id}/verify`, {
        method: "POST",
        authRequired: true,
        body: { verification_status: status, notes: "Verified via Admin Dashboard" },
      }),
    onSuccess: () => {
      setFeedback("Station verification updated.");
      qc.invalidateQueries({ queryKey: ["admin-stations"] });
      qc.invalidateQueries({ queryKey: ["admin-quality"] });
    },
  });

  const csvMut = useMutation({
    mutationFn: () => {
      if (!csvFile) throw new Error("Choose a CSV file first.");
      const fd = new FormData();
      fd.append("file", csvFile);
      return apiRequest<{
        total_rows: number;
        created_stations: number;
        merged_records: number;
        pending_review: number;
      }>("/admin/import-csv?source_name=Admin+CSV+Upload", {
        method: "POST",
        authRequired: true,
        formData: fd,
      });
    },
    onSuccess: (res) => {
      setFeedback(
        `CSV processed (${res.total_rows} rows): ${res.created_stations} created, ${res.merged_records} merged, ${res.pending_review} flagged for review.`
      );
      qc.invalidateQueries({ queryKey: ["admin-quality"] });
    },
    onError: (e) => setErrorMsg((e as Error).message),
  });

  const resolveDupMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      apiRequest(`/admin/duplicates/${id}/resolve`, {
        method: "POST",
        authRequired: true,
        body: { action },
      }),
    onSuccess: () => {
      setFeedback("Duplicate record resolved.");
      qc.invalidateQueries({ queryKey: ["admin-duplicates"] });
      qc.invalidateQueries({ queryKey: ["admin-quality"] });
    },
  });

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div>
        <span className="cw-pill cw-pill-verified">Admin RBAC Enforced</span>
        <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#121317] mt-[8px] mb-0">
          Infrastructure Data Curation & Quality
        </h1>
      </div>

      {feedback && <StatusAlert title="Completed" message={feedback} />}
      {errorMsg && <StatusAlert title="Action failed" message={errorMsg} variant="error" />}

      <div className="flex flex-wrap gap-[8px]" role="tablist">
        {[
          { id: "quality", label: "Data Quality & Analytics" },
          { id: "stations", label: "Stations & Verification" },
          { id: "import", label: "CSV Import" },
          { id: "duplicates", label: "Duplicate Queue" },
          { id: "audit", label: "Audit Logs" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={tab === t.id ? "cw-btn-primary" : "cw-btn-secondary"}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "quality" && quality && (
        <div className="space-y-[20px]">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-[14px]">
            <div className="cw-card p-[16px]">
              <p className="text-[11px] text-[#6A6A71] m-0">Active Stations</p>
              <p className="text-[24px] font-semibold m-0 mt-[4px]">{quality.active_stations}</p>
            </div>
            <div className="cw-card p-[16px]">
              <p className="text-[11px] text-[#6A6A71] m-0">Connectors</p>
              <p className="text-[24px] font-semibold m-0 mt-[4px]">{quality.total_connectors}</p>
            </div>
            <div className="cw-card p-[16px]">
              <p className="text-[11px] text-[#6A6A71] m-0">Unverified Pricing</p>
              <p className="text-[24px] font-semibold m-0 mt-[4px]">{quality.unverified_pricing_count}</p>
            </div>
            <div className="cw-card p-[16px]">
              <p className="text-[11px] text-[#6A6A71] m-0">Pending Duplicates</p>
              <p className="text-[24px] font-semibold m-0 mt-[4px]">{quality.pending_duplicate_reviews}</p>
            </div>
            <div className="cw-card p-[16px]">
              <p className="text-[11px] text-[#6A6A71] m-0">Failed Outbox Syncs</p>
              <p className="text-[24px] font-semibold m-0 mt-[4px]">{quality.failed_outbox_events}</p>
            </div>
          </div>

          {overview && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
              <div className="cw-card p-[20px]">
                <h2 className="text-[16px] font-semibold m-0 mb-[12px]">
                  Stations by District (Live PostgreSQL)
                </h2>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={overview.stations_by_district.slice(0, 8)}>
                      <CartesianGrid stroke="#E6EAF0" strokeDasharray="3 3" />
                      <XAxis dataKey="district" tick={{ fontSize: 11, fill: "#45474D" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#45474D" }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#121317" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="cw-card p-[20px]">
                <h2 className="text-[16px] font-semibold m-0 mb-[12px]">
                  Stations by Operator (Live PostgreSQL)
                </h2>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={overview.stations_by_operator.slice(0, 8)}>
                      <CartesianGrid stroke="#E6EAF0" strokeDasharray="3 3" />
                      <XAxis dataKey="operator" tick={{ fontSize: 11, fill: "#45474D" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#45474D" }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#45474D" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "stations" && (
        <div className="space-y-[20px]">
          <div className="cw-card p-[24px] space-y-[14px]">
            <h2 className="text-[18px] font-semibold m-0">Add Verified Station</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[12px]">
              <input
                className="cw-input"
                placeholder="Station name"
                value={stName}
                onChange={(e) => setStName(e.target.value)}
              />
              <select
                className="cw-input"
                value={stOpId}
                onChange={(e) => setStOpId(e.target.value)}
              >
                <option value="">Operator (optional)</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
              <input
                className="cw-input"
                placeholder="Address"
                value={stAddress}
                onChange={(e) => setStAddress(e.target.value)}
              />
              <input
                className="cw-input"
                placeholder="City"
                value={stCity}
                onChange={(e) => setStCity(e.target.value)}
              />
              <input
                className="cw-input"
                placeholder="District"
                value={stDistrict}
                onChange={(e) => setStDistrict(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-[6px]">
                <input className="cw-input" placeholder="Lat" value={stLat} onChange={(e) => setStLat(e.target.value)} />
                <input className="cw-input" placeholder="Lon" value={stLon} onChange={(e) => setStLon(e.target.value)} />
                <input className="cw-input" placeholder="kW" value={stPower} onChange={(e) => setStPower(e.target.value)} />
              </div>
            </div>
            <button
              type="button"
              disabled={!stName || !stAddress || createStationMut.isPending}
              onClick={() => createStationMut.mutate()}
              className="cw-btn-primary"
            >
              Create Station
            </button>
          </div>

          <div className="cw-card p-[24px] space-y-[10px]">
            <h2 className="text-[18px] font-semibold m-0">Recent Stations Verification</h2>
            {stationList?.items.map((s) => (
              <div
                key={s.id}
                className="cw-card-muted p-[12px] flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]"
              >
                <div>
                  <p className="text-[14px] font-medium m-0">{s.name}</p>
                  <p className="text-[12px] text-[#45474D] m-0">
                    {s.city} · Status: {s.verification_status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-[6px]">
                  <button
                    type="button"
                    onClick={() => verifyMut.mutate({ id: s.id, status: "location_verified" })}
                    className="cw-btn-secondary py-[5px] px-[10px]"
                  >
                    Mark Location Verified
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      verifyMut.mutate({ id: s.id, status: "operational_status_verified" })
                    }
                    className="cw-btn-primary py-[5px] px-[10px]"
                  >
                    Mark Operational Verified
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "import" && (
        <div className="cw-card p-[24px] space-y-[14px]">
          <h2 className="text-[18px] font-semibold m-0">CSV Bulk Import with Deduplication</h2>
          <p className="text-[14px] text-[#45474D] m-0">
            Required headers: <code>name,address,city,district,latitude,longitude</code> (optional: <code>operator,connector_type,power_kw,source_id</code>).
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="cw-input"
          />
          <button
            type="button"
            disabled={!csvFile || csvMut.isPending}
            onClick={() => csvMut.mutate()}
            className="cw-btn-primary"
          >
            {csvMut.isPending ? "Importing..." : "Upload & Deduplicate CSV"}
          </button>
        </div>
      )}

      {tab === "duplicates" && (
        <div className="cw-card p-[24px] space-y-[12px]">
          <h2 className="text-[18px] font-semibold m-0">Pending Duplicate Review Queue</h2>
          {duplicates.length === 0 ? (
            <p className="text-[14px] text-[#45474D] m-0">No ambiguous duplicate records awaiting review.</p>
          ) : (
            duplicates.map((d) => (
              <div key={d.id} className="cw-card-muted p-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]">
                <div>
                  <p className="text-[14px] font-medium m-0">
                    {d.raw_name} ({d.source_name}) — Match Score {d.match_score}
                  </p>
                  <p className="text-[12px] text-[#45474D] m-0">{d.raw_operator || "Unknown operator"}</p>
                </div>
                <div className="flex gap-[8px]">
                  <button
                    type="button"
                    onClick={() => resolveDupMut.mutate({ id: d.id, action: "merge_into_station" })}
                    className="cw-btn-primary py-[5px] px-[12px]"
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveDupMut.mutate({ id: d.id, action: "create_new_station" })}
                    className="cw-btn-secondary py-[5px] px-[12px]"
                  >
                    Create Distinct
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveDupMut.mutate({ id: d.id, action: "reject_duplicate" })}
                    className="cw-btn-secondary py-[5px] px-[12px]"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="cw-card p-[24px] space-y-[10px]">
          <h2 className="text-[18px] font-semibold m-0">Administrative Audit History</h2>
          {auditLogs.length === 0 ? (
            <p className="text-[14px] text-[#45474D] m-0">No audit entries yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="cw-card-muted p-[12px] text-[13px]">
                <strong className="text-[#121317]">{log.action}</strong> · {log.entity_type}{" "}
                <span className="text-[#6A6A71]">({new Date(log.created_at).toLocaleString()})</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
