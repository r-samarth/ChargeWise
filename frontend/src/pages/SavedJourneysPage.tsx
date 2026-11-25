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
    <div className="max-w-[1120px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">Saved Journeys</h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
            Revisit your bookmarked Karnataka EV routes and charging stop plans.
          </p>
        </div>
        <Link to="/plan" className="cw-btn-primary">
          Plan New Journey
        </Link>
      </div>

      {error && (
        <StatusAlert title="Could not load trips" message={(error as Error).message} variant="error" />
      )}

      {isLoading ? (
        <div className="cw-card p-[24px] text-[#45474D]">Loading saved journeys...</div>
      ) : trips.length === 0 ? (
        <div className="cw-card p-[36px] text-center space-y-[12px]">
          <p className="text-[15px] text-[#45474D] m-0">
            You have no saved journeys yet.
          </p>
          <Link to="/plan" className="cw-btn-primary">
            Plan Mysuru → Mangaluru
          </Link>
        </div>
      ) : (
        <div className="space-y-[12px]">
          {trips.map((t) => (
            <div
              key={t.id}
              className="cw-card p-[20px] flex flex-col sm:flex-row sm:items-center justify-between gap-[14px]"
            >
              <div className="space-y-[4px]">
                <h2 className="text-[18px] font-semibold text-[#121317] m-0">{t.title}</h2>
                <p className="text-[13px] text-[#45474D] m-0">
                  {t.total_distance_km} km · Drive {t.estimated_drive_minutes}m + Charge{" "}
                  {t.estimated_charge_minutes}m · Arrival SOC {t.arrival_soc_pct}%
                </p>
                <p className="text-[11px] text-[#6A6A71] m-0">
                  Created {new Date(t.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-[8px]">
                <Link to={`/trips/${t.id}`} className="cw-btn-primary py-[6px] px-[14px]">
                  Open Route
                </Link>
                <button
                  type="button"
                  disabled={deleteMut.isPending}
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
