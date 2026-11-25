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
    <div className="max-w-[1120px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">Your EV Garage</h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
            Manage battery capacities, consumption ratings, and connector compatibility.
          </p>
        </div>
        <Link to="/vehicles/new" className="cw-btn-primary">
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
        <div className="cw-card p-[24px] text-[#45474D]">Loading your vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="cw-card p-[36px] text-center space-y-[14px]">
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">No vehicles added yet</h2>
          <p className="text-[15px] text-[#45474D] m-0">
            Add your EV manually or import verified specifications from our Indian EV catalog.
          </p>
          <Link to="/vehicles/new" className="cw-btn-primary">
            Add your first EV
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
          {vehicles.map((v) => (
            <div key={v.id} className="cw-card p-[24px] space-y-[14px]">
              <div className="flex items-start justify-between gap-[12px]">
                <div>
                  <div className="flex items-center gap-[8px]">
                    <h2 className="text-[18px] font-semibold text-[#121317] m-0">{v.nickname}</h2>
                    {v.is_default && <span className="cw-pill cw-pill-verified">Default</span>}
                  </div>
                  <p className="text-[13px] text-[#45474D] mt-[4px] mb-0">
                    {v.model_year} {v.manufacturer} {v.model} — {v.variant}
                  </p>
                </div>
                <span className="cw-pill">{v.specs_source.replace("_", " ")}</span>
              </div>

              <div className="grid grid-cols-2 gap-[10px] cw-card-muted p-[14px] text-[13px]">
                <div>
                  <span className="text-[#6A6A71] block">Usable / Total Battery</span>
                  <strong className="text-[#121317]">
                    {v.usable_battery_kwh} / {v.battery_capacity_kwh} kWh
                  </strong>
                </div>
                <div>
                  <span className="text-[#6A6A71] block">Consumption</span>
                  <strong className="text-[#121317]">{v.consumption_kwh_per_100km} kWh/100 km</strong>
                </div>
                <div>
                  <span className="text-[#6A6A71] block">Max DC / AC</span>
                  <strong className="text-[#121317]">
                    {v.max_dc_power_kw} kW DC · {v.max_ac_power_kw} kW AC
                  </strong>
                </div>
                <div>
                  <span className="text-[#6A6A71] block">Connectors</span>
                  <strong className="text-[#121317]">{v.connector_types.join(", ")}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-[8px] pt-[4px]">
                <div className="flex flex-wrap gap-[8px]">
                  <Link to={`/vehicles/${v.id}/edit`} className="cw-btn-secondary py-[6px] px-[12px]">
                    <Edit3 size={14} aria-hidden="true" />
                    <span>Edit</span>
                  </Link>
                  {!v.is_default && (
                    <button
                      type="button"
                      disabled={setDefaultMut.isPending}
                      onClick={() => setDefaultMut.mutate(v.id)}
                      className="cw-btn-secondary py-[6px] px-[12px]"
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
                  className="cw-btn-secondary py-[6px] px-[12px]"
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
