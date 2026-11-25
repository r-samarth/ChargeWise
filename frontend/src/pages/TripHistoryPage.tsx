import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { apiRequest } from "../lib/api";
import type { TripSummary } from "../types/api";

export function TripHistoryPage() {
  const qc = useQueryClient();
  const { data: trips = [], isLoading, error } = useQuery({
    queryKey: ["trips", "all"],
    queryFn: () => apiRequest<TripSummary[]>("/trips", { authRequired: true }),
  });

  const saveToggleMut = useMutation({
    mutationFn: ({ id, is_saved }: { id: string; is_saved: boolean }) =>
      apiRequest(`/trips/${id}`, {
        method: "PATCH",
        authRequired: true,
        body: { is_saved },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/trips/${id}`, { method: "DELETE", authRequired: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="cw-eyebrow">Route Archive</span>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            Trip History
          </h1>
          <p className="text-[15px] text-[#475569]">
            All route calculations and saved journeys stored in PostgreSQL.
          </p>
        </div>
        <Link to="/plan" className="cw-btn-primary shrink-0">
          New Calculation
        </Link>
      </div>

      {error && (
        <StatusAlert title="Could not load history" message={(error as Error).message} variant="error" />
      )}

      {isLoading ? (
        <div className="cw-card p-6 text-[#475569]">Loading history...</div>
      ) : trips.length === 0 ? (
        <div className="cw-card p-9 text-center">
          <p className="text-[15px] text-[#475569]">No trip calculations recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <div
              key={t.id}
              className="cw-card cw-card-interactive p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold text-[#0F172A]">{t.title}</h2>
                  {t.is_saved && <span className="cw-pill cw-pill-accent">Saved</span>}
                </div>
                <p className="text-[13.5px] font-medium text-[#475569] cw-num">
                  Start {t.start_soc_pct}% → Arrival {t.arrival_soc_pct}% · {t.total_distance_km} km ·{" "}
                  {t.total_energy_kwh} kWh
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => saveToggleMut.mutate({ id: t.id, is_saved: !t.is_saved })}
                  className="cw-btn-secondary !py-1.5 !px-3.5"
                >
                  <Bookmark size={14} aria-hidden="true" />
                  <span>{t.is_saved ? "Unsave" : "Save"}</span>
                </button>
                <Link to={`/trips/${t.id}`} className="cw-btn-primary !py-1.5 !px-4">
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(t.id)}
                  className="cw-btn-secondary !py-1.5 !px-3 hover:!text-[#BE123C] hover:!border-[#FDA4AF]"
                  aria-label={`Delete ${t.title}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
