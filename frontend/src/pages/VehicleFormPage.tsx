import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { StatusAlert } from "../components/StatusAlert";
import {
  Vehicle3DInteractiveStage,
  Vehicle3DThumbnail,
} from "../components/Vehicle3DModel";
import { getVehicleVisualProfile } from "../constants/evShowcaseCatalog";
import { apiRequest } from "../lib/api";
import type { Vehicle, VehicleCatalogItem } from "../types/api";

const CONNECTOR_OPTIONS = [
  "CCS2",
  "TYPE_2",
  "BHARAT_DC_001",
  "BHARAT_AC_001",
  "CHADEMO",
  "ATHER_PROPRIETARY",
  "TYPE_6",
];

const vehicleSchema = z
  .object({
    nickname: z.string().min(1, "Nickname is required.").max(100),
    manufacturer: z.string().min(1, "Manufacturer is required.").max(80),
    model: z.string().min(1, "Model is required.").max(80),
    variant: z.string().min(1, "Variant is required.").max(120),
    model_year: z.coerce.number().int().min(2015).max(2030),
    battery_capacity_kwh: z.coerce.number().gt(0.5).max(250),
    usable_battery_kwh: z.coerce.number().gt(0.5).max(250),
    consumption_kwh_per_100km: z.coerce.number().gt(1).max(60),
    max_ac_power_kw: z.coerce.number().min(0).max(50),
    max_dc_power_kw: z.coerce.number().min(0).max(400),
    connector_types: z.array(z.string()).min(1, "Select at least one connector."),
    specs_source: z.enum(["oem_verified", "user_entered", "estimated"]),
    is_default: z.boolean(),
  })
  .refine((d) => d.usable_battery_kwh <= d.battery_capacity_kwh, {
    message: "Usable battery capacity cannot exceed total battery capacity.",
    path: ["usable_battery_kwh"],
  })
  .refine((d) => d.max_ac_power_kw > 0 || d.max_dc_power_kw > 0, {
    message: "At least one charging rate (AC or DC) must exceed 0 kW.",
    path: ["max_dc_power_kw"],
  });

type FormValues = z.infer<typeof vehicleSchema>;
type CategoryFilter = "ALL" | "4W Car / SUV" | "4W Sedan / Coupe" | "2W Scooter / Bike";

export function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [brandQuery, setBrandQuery] = useState("");

  const { data: catalog = [] } = useQuery({
    queryKey: ["ev-catalog"],
    queryFn: () => apiRequest<VehicleCatalogItem[]>("/vehicles/catalog"),
  });

  const { data: existingVehicle } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => apiRequest<Vehicle>(`/vehicles/${id}`, { authRequired: true }),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(vehicleSchema) as never,
    defaultValues: {
      nickname: "",
      manufacturer: "Tata",
      model: "Nexon.ev",
      variant: "Long Range 45 kWh",
      model_year: 2025,
      battery_capacity_kwh: 45,
      usable_battery_kwh: 42.5,
      consumption_kwh_per_100km: 13.5,
      max_ac_power_kw: 7.2,
      max_dc_power_kw: 60,
      connector_types: ["CCS2", "TYPE_2"],
      specs_source: "user_entered",
      is_default: true,
    },
  });

  useEffect(() => {
    if (existingVehicle) {
      reset({
        nickname: existingVehicle.nickname,
        manufacturer: existingVehicle.manufacturer,
        model: existingVehicle.model,
        variant: existingVehicle.variant,
        model_year: existingVehicle.model_year,
        battery_capacity_kwh: existingVehicle.battery_capacity_kwh,
        usable_battery_kwh: existingVehicle.usable_battery_kwh,
        consumption_kwh_per_100km: existingVehicle.consumption_kwh_per_100km,
        max_ac_power_kw: existingVehicle.max_ac_power_kw,
        max_dc_power_kw: existingVehicle.max_dc_power_kw,
        connector_types: existingVehicle.connector_types,
        specs_source: existingVehicle.specs_source as "oem_verified" | "user_entered" | "estimated",
        is_default: existingVehicle.is_default,
      });
    }
  }, [existingVehicle, reset]);

  const applyTemplate = (item: VehicleCatalogItem) => {
    setSelectedCatalogId(item.id);
    setValue("nickname", `${item.manufacturer} ${item.model}`);
    setValue("manufacturer", item.manufacturer);
    setValue("model", item.model);
    setValue("variant", item.variant);
    setValue("model_year", item.model_year);
    setValue("battery_capacity_kwh", item.battery_capacity_kwh);
    setValue("usable_battery_kwh", item.usable_battery_kwh);
    setValue("consumption_kwh_per_100km", item.consumption_kwh_per_100km);
    setValue("max_ac_power_kw", item.max_ac_power_kw);
    setValue("max_dc_power_kw", item.max_dc_power_kw);
    setValue("connector_types", item.connector_types);
    setValue("specs_source", "oem_verified");
    setSelectedNote(item.specs_notes);
  };

  const filteredCatalog = useMemo(() => {
    const needle = brandQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      const vp = getVehicleVisualProfile(item.manufacturer, item.model);
      if (categoryFilter !== "ALL" && vp.category !== categoryFilter) {
        return false;
      }
      if (!needle) return true;
      return `${item.manufacturer} ${item.model} ${item.variant}`
        .toLowerCase()
        .includes(needle);
    });
  }, [catalog, categoryFilter, brandQuery]);

  const currentMfg = watch("manufacturer");
  const currentModel = watch("model");
  const selectedConnectors = watch("connector_types") || [];

  const toggleConnector = (c: string) => {
    if (selectedConnectors.includes(c)) {
      setValue(
        "connector_types",
        selectedConnectors.filter((x) => x !== c),
        { shouldValidate: true }
      );
    } else {
      setValue("connector_types", [...selectedConnectors, c], { shouldValidate: true });
    }
  };

  const saveMut = useMutation({
    mutationFn: (payload: FormValues) =>
      isEdit
        ? apiRequest(`/vehicles/${id}`, {
            method: "PATCH",
            body: payload,
            authRequired: true,
          })
        : apiRequest("/vehicles", {
            method: "POST",
            body: payload,
            authRequired: true,
          }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      navigate("/vehicles");
    },
    onError: (err) => setServerError((err as Error).message),
  });

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="cw-eyebrow">
            <Sparkles size={13} aria-hidden="true" />
            <span>3D Indian EV Showroom</span>
          </span>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            {isEdit ? "Edit EV" : "Add an Electric Vehicle"}
          </h1>
          <p className="text-[15px] text-[#475569]">
            Inspect live 3D vehicle models, select any verified Indian EV trim, or enter custom specifications.
          </p>
        </div>
        <Link to="/vehicles" className="cw-btn-secondary shrink-0">
          Back to Garage
        </Link>
      </div>

      {/* Interactive 3D Stage */}
      <section className="cw-card p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7">
          <Vehicle3DInteractiveStage
            manufacturer={currentMfg}
            model={currentModel}
            height="260px"
          />
        </div>
        <div className="lg:col-span-5 space-y-3">
          <span className="cw-pill cw-pill-accent">
            {getVehicleVisualProfile(currentMfg, currentModel).highlightTag}
          </span>
          <h2 className="text-[22px] font-bold text-[#0F172A]">
            {currentMfg || "Custom"} {currentModel || "EV Model"}
          </h2>
          <p className="text-[14px] text-[#475569] leading-relaxed">
            {selectedNote ||
              "Rotate the 3D showcase above to inspect the silhouette. Pick a model below to populate factory battery capacity, consumption, and fast-charging curve."}
          </p>
          <div className="grid grid-cols-3 gap-2.5 cw-card-muted p-3.5 text-[12.5px]">
            <div>
              <span className="text-[#64748B] block">Usable kWh</span>
              <strong className="text-[#0F172A] cw-num">{watch("usable_battery_kwh")} kWh</strong>
            </div>
            <div>
              <span className="text-[#64748B] block">Peak DC</span>
              <strong className="text-[#1D4ED8] cw-num">
                {watch("max_dc_power_kw") > 0 ? `${watch("max_dc_power_kw")} kW` : "AC Only"}
              </strong>
            </div>
            <div>
              <span className="text-[#64748B] block">Max AC</span>
              <strong className="text-[#0F766E] cw-num">{watch("max_ac_power_kw")} kW</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Catalog Picker Grid */}
      {!isEdit && catalog.length > 0 && (
        <section className="cw-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-[18px] font-bold text-[#0F172A]">
                Verified Indian EV Lineup ({catalog.length} Models & Trims)
              </h2>
              <p className="text-[13px] text-[#64748B]">
                Click any 3D model card below to load its verified specifications into the configurator.
              </p>
            </div>
            <div className="relative w-full md:w-[270px]">
              <input
                type="search"
                aria-label="Search EV models"
                placeholder="Search Tata, Mahindra, BYD..."
                className="cw-input !pl-9 !py-2"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
              />
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                "ALL",
                "4W Car / SUV",
                "4W Sedan / Coupe",
                "2W Scooter / Bike",
              ] as CategoryFilter[]
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={
                  categoryFilter === cat
                    ? "cw-btn-primary !py-1.5 !px-3.5"
                    : "cw-btn-secondary !py-1.5 !px-3.5"
                }
              >
                {cat === "ALL" ? "All Vehicles" : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[540px] overflow-y-auto pr-1">
            {filteredCatalog.map((item) => {
              const isSelected = selectedCatalogId === item.id;
              const vp = getVehicleVisualProfile(item.manufacturer, item.model);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyTemplate(item)}
                  className={`group text-left rounded-[18px] p-3.5 transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#EFF6FF]/95 border-[#2563EB] ring-2 ring-[#2563EB]/25 shadow-md"
                      : "bg-white/75 border-white/90 hover:border-[#93C5FD] hover:bg-white/95 shadow-sm"
                  }`}
                >
                  <Vehicle3DThumbnail
                    manufacturer={item.manufacturer}
                    model={item.model}
                    className="h-[116px] w-full mb-2.5"
                  />
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-[15px] text-[#0F172A] leading-snug">
                        {item.manufacturer} {item.model}
                      </span>
                      <span className="cw-pill cw-pill-accent cw-num shrink-0">
                        {item.battery_capacity_kwh} kWh
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#475569] truncate">
                      {item.variant} · {item.model_year}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1 text-[11.5px] text-[#64748B] cw-num">
                      <span>
                        {item.max_dc_power_kw > 0
                          ? `DC ${item.max_dc_power_kw} kW`
                          : `AC ${item.max_ac_power_kw} kW only`}
                      </span>
                      <span className="text-[#1D4ED8] font-medium">{vp.claimedRangeLabel}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {serverError && (
        <StatusAlert title="Could not save vehicle" message={serverError} variant="error" />
      )}

      <form
        onSubmit={handleSubmit((vals) => saveMut.mutate(vals))}
        className="cw-card p-6 sm:p-7 space-y-5"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nickname" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Vehicle nickname
            </label>
            <input id="nickname" className="cw-input" {...register("nickname")} />
            {errors.nickname && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">{errors.nickname.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="model_year" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Model year
            </label>
            <input id="model_year" type="number" className="cw-input cw-num" {...register("model_year")} />
          </div>
          <div>
            <label htmlFor="manufacturer" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Manufacturer
            </label>
            <input id="manufacturer" className="cw-input" {...register("manufacturer")} />
          </div>
          <div>
            <label htmlFor="model" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Model
            </label>
            <input id="model" className="cw-input" {...register("model")} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="variant" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Variant
            </label>
            <input id="variant" className="cw-input" {...register("variant")} />
          </div>
          <div>
            <label htmlFor="battery_capacity_kwh" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Total battery capacity (kWh)
            </label>
            <input
              id="battery_capacity_kwh"
              type="number"
              step="0.1"
              className="cw-input cw-num"
              {...register("battery_capacity_kwh")}
            />
          </div>
          <div>
            <label htmlFor="usable_battery_kwh" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Usable battery capacity (kWh)
            </label>
            <input
              id="usable_battery_kwh"
              type="number"
              step="0.1"
              className="cw-input cw-num"
              {...register("usable_battery_kwh")}
            />
            {errors.usable_battery_kwh && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">
                {errors.usable_battery_kwh.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="consumption_kwh_per_100km" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Typical consumption (kWh / 100 km)
            </label>
            <input
              id="consumption_kwh_per_100km"
              type="number"
              step="0.1"
              className="cw-input cw-num"
              {...register("consumption_kwh_per_100km")}
            />
          </div>
          <div>
            <label htmlFor="specs_source" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Specification source
            </label>
            <select id="specs_source" className="cw-input" {...register("specs_source")}>
              <option value="oem_verified">OEM Verified</option>
              <option value="user_entered">User Entered</option>
              <option value="estimated">Estimated</option>
            </select>
          </div>
          <div>
            <label htmlFor="max_dc_power_kw" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Max DC charging power (kW)
            </label>
            <input
              id="max_dc_power_kw"
              type="number"
              step="0.5"
              className="cw-input cw-num"
              {...register("max_dc_power_kw")}
            />
            {errors.max_dc_power_kw && (
              <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">
                {errors.max_dc_power_kw.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="max_ac_power_kw" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Max AC charging power (kW)
            </label>
            <input
              id="max_ac_power_kw"
              type="number"
              step="0.1"
              className="cw-input cw-num"
              {...register("max_ac_power_kw")}
            />
          </div>
        </div>

        <div>
          <span className="block text-[13px] font-semibold text-[#1E293B] mb-2">
            Supported connectors
          </span>
          <div className="flex flex-wrap gap-2">
            {CONNECTOR_OPTIONS.map((conn) => {
              const active = selectedConnectors.includes(conn);
              return (
                <button
                  key={conn}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleConnector(conn)}
                  className={active ? "cw-btn-primary !py-1.5 !px-3.5" : "cw-btn-secondary !py-1.5 !px-3.5"}
                >
                  {conn}
                </button>
              );
            })}
          </div>
          {errors.connector_types && (
            <p className="text-[12.5px] font-medium text-[#BE123C] mt-1">
              {errors.connector_types.message}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-[14px] text-[#334155]">
          <input type="checkbox" className="accent-[#2563EB] w-4 h-4" {...register("is_default")} />
          <span>Set as default vehicle for trip planning</span>
        </label>

        <div className="flex justify-end gap-2.5 pt-2">
          <Link to="/vehicles" className="cw-btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saveMut.isPending} className="cw-btn-primary">
            {saveMut.isPending ? "Saving vehicle..." : isEdit ? "Update vehicle" : "Save vehicle"}
          </button>
        </div>
      </form>
    </div>
  );
}
