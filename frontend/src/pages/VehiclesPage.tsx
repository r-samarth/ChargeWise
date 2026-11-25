import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Star, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { apiRequest } from "../lib/api";
import type { Vehicle } from "../types/api";

export function VehiclesPage() {
  const qc = useQueryClient();
  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest<Vehicle[]>("/vehicles", { authRequired: true }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/vehicles/${id}`, { method: "DELETE", authRequired: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const setDefaultMut = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/vehicles/${id}`, {
        method: "PATCH",
        authRequired: true,
        body: { is_default: true },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="cw-eyebrow">Garage Profiles</span>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            Your EV Garage
          </h1>
          <p className="text-[15px] text-[#475569]">
            Manage battery capacities, consumption ratings, and connector compatibility.
          </p>
        </div>
        <Link to="/vehicles/new" className="cw-btn-primary shrink-0">
          <Plus size={16} aria-hidden="true" />
          <span>Add Vehicle</span>
        </Link>
      </div>

      {error && (
        <StatusAlert
          title="Could not load vehicles"
          message={(error as Error).message}
          variant="error"
        />
      )}

      {isLoading ? (
        <div className="cw-card p-6 text-[#475569]">Loading your vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="cw-card p-9 text-center space-y-3.5">
          <h2 className="text-[18px] font-bold text-[#0F172A]">No vehicles added yet</h2>
          <p className="text-[15px] text-[#475569]">
            Add your EV manually or import verified specifications from our Indian EV catalog.
          </p>
          <Link to="/vehicles/new" className="cw-btn-primary">
            Add your first EV
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="cw-card cw-card-interactive p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-bold text-[#0F172A]">{v.nickname}</h2>
                    {v.is_default && <span className="cw-pill cw-pill-verified">Default</span>}
                  </div>
                  <p className="text-[13px] font-medium text-[#475569] cw-num">
                    {v.model_year} {v.manufacturer} {v.model} — {v.variant}
                  </p>
                </div>
                <span className="cw-pill cw-pill-accent">{v.specs_source.replace("_", " ")}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 cw-card-muted p-4 text-[13px]">
                <div>
                  <span className="text-[#64748B] block text-[12px]">Usable / Total Battery</span>
                  <strong className="text-[#0F172A] cw-num">
                    {v.usable_battery_kwh} / {v.battery_capacity_kwh} kWh
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[12px]">Consumption</span>
                  <strong className="text-[#0F172A] cw-num">
                    {v.consumption_kwh_per_100km} kWh/100 km
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[12px]">Max DC / AC</span>
                  <strong className="text-[#1D4ED8] cw-num">
                    {v.max_dc_power_kw} kW DC · {v.max_ac_power_kw} kW AC
                  </strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[12px]">Connectors</span>
                  <strong className="text-[#0F172A]">{v.connector_types.join(", ")}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-2">
                  <Link to={`/vehicles/${v.id}/edit`} className="cw-btn-secondary !py-1.5 !px-3.5">
                    <Edit3 size={14} aria-hidden="true" />
                    <span>Edit</span>
                  </Link>
                  {!v.is_default && (
                    <button
                      type="button"
                      disabled={setDefaultMut.isPending}
                      onClick={() => setDefaultMut.mutate(v.id)}
                      className="cw-btn-secondary !py-1.5 !px-3.5"
                    >
                      <Star size={14} aria-hidden="true" />
                      <span>Set default</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(v.id)}
                  className="cw-btn-secondary !py-1.5 !px-3.5 hover:!text-[#BE123C] hover:!border-[#FDA4AF] hover:!bg-[#FFE4E6]/65"
                  aria-label={`Delete ${v.nickname}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
