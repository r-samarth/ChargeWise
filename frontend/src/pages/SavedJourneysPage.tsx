import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { apiRequest } from "../lib/api";
import type { TripSummary } from "../types/api";

export function SavedJourneysPage() {
  const qc = useQueryClient();
  const { data: trips = [], isLoading, error } = useQuery({
    queryKey: ["trips", "saved"],
    queryFn: () => apiRequest<TripSummary[]>("/trips?saved_only=true", { authRequired: true }),
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
          <span className="cw-eyebrow">Bookmarks</span>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            Saved Journeys
          </h1>
          <p className="text-[15px] text-[#475569]">
            Revisit your bookmarked Karnataka EV routes and charging stop plans.
          </p>
        </div>
        <Link to="/plan" className="cw-btn-primary shrink-0">
          Plan New Journey
        </Link>
      </div>

      {error && (
        <StatusAlert title="Could not load trips" message={(error as Error).message} variant="error" />
      )}

      {isLoading ? (
        <div className="cw-card p-6 text-[#475569]">Loading saved journeys...</div>
      ) : trips.length === 0 ? (
        <div className="cw-card p-9 text-center space-y-3.5">
          <p className="text-[15px] text-[#475569]">
            You have no saved journeys yet.
          </p>
          <Link to="/plan" className="cw-btn-primary">
            Plan Mysuru → Mangaluru
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => (
            <div
              key={t.id}
              className="cw-card cw-card-interactive p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <h2 className="text-[18px] font-bold text-[#0F172A]">{t.title}</h2>
                <p className="text-[13.5px] font-medium text-[#334155] cw-num">
                  {t.total_distance_km} km · Drive {t.estimated_drive_minutes}m + Charge{" "}
                  {t.estimated_charge_minutes}m · Arrival SOC {t.arrival_soc_pct}%
                </p>
                <p className="text-[12px] text-[#64748B] cw-num">
                  Created {new Date(t.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/trips/${t.id}`} className="cw-btn-primary !py-1.5 !px-4">
                  Open Route
                </Link>
                <button
                  type="button"
                  disabled={deleteMut.isPending}
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
