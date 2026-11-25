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
    <div className="max-w-[1120px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">Trip History</h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
            All route calculations and saved journeys stored in PostgreSQL.
          </p>
        </div>
        <Link to="/plan" className="cw-btn-primary">
          New Calculation
        </Link>
      </div>

      {error && (
        <StatusAlert title="Could not load history" message={(error as Error).message} variant="error" />
      )}

      {isLoading ? (
        <div className="cw-card p-[24px] text-[#45474D]">Loading history...</div>
      ) : trips.length === 0 ? (
        <div className="cw-card p-[36px] text-center">
          <p className="text-[15px] text-[#45474D] m-0">No trip calculations recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-[12px]">
          {trips.map((t) => (
            <div
              key={t.id}
              className="cw-card p-[20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px]"
            >
              <div className="space-y-[4px]">
                <div className="flex items-center gap-[8px]">
                  <h2 className="text-[18px] font-semibold text-[#121317] m-0">{t.title}</h2>
                  {t.is_saved && <span className="cw-pill cw-pill-accent">Saved</span>}
                </div>
                <p className="text-[13px] text-[#45474D] m-0">
                  Start {t.start_soc_pct}% → Arrival {t.arrival_soc_pct}% · {t.total_distance_km} km ·{" "}
                  {t.total_energy_kwh} kWh
                </p>
              </div>
              <div className="flex items-center gap-[8px]">
                <button
                  type="button"
                  onClick={() => saveToggleMut.mutate({ id: t.id, is_saved: !t.is_saved })}
                  className="cw-btn-secondary py-[6px] px-[12px]"
                >
                  <Bookmark size={14} aria-hidden="true" />
                  <span>{t.is_saved ? "Unsave" : "Save"}</span>
                </button>
                <Link to={`/trips/${t.id}`} className="cw-btn-primary py-[6px] px-[14px]">
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(t.id)}
                  className="cw-btn-secondary py-[6px] px-[12px]"
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
