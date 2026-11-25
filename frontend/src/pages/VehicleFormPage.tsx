import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { StatusAlert } from "../components/StatusAlert";
import { apiRequest } from "../lib/api";
import type { Vehicle, VehicleCatalogItem } from "../types/api";

const CONNECTOR_OPTIONS = [
  "CCS2",
  "TYPE_2",
  "BHARAT_DC_001",
  "BHARAT_AC_001",
  "CHADEMO",
  "ATHER_PROPRIETARY",
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

export function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

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
      manufacturer: "",
      model: "",
      variant: "",
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
    <div className="max-w-[920px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div>
          <h1 className="text-[28px] font-semibold text-[#121317] m-0">
            {isEdit ? "Edit EV" : "Add an Electric Vehicle"}
          </h1>
          <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
            Choose a verified Indian EV template or enter custom specs directly.
          </p>
        </div>
        <Link to="/vehicles" className="cw-btn-secondary">
          Back to Garage
        </Link>
      </div>

      {!isEdit && catalog.length > 0 && (
        <section className="cw-card p-[20px] space-y-[12px]">
          <p className="text-[13px] font-medium text-[#121317] m-0">
            Verified Indian EV Templates (click to pre-fill)
          </p>
          <div className="flex flex-wrap gap-[8px]">
            {catalog.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => applyTemplate(item)}
                className="cw-btn-secondary py-[6px] px-[12px] text-[13px]"
              >
                {item.manufacturer} {item.model} ({item.battery_capacity_kwh} kWh)
              </button>
            ))}
          </div>
          {selectedNote && (
            <p className="text-[13px] text-[#45474D] m-0 cw-card-muted p-[10px]">
              Spec disclosure: {selectedNote}
            </p>
          )}
        </section>
      )}

      {serverError && (
        <StatusAlert title="Could not save vehicle" message={serverError} variant="error" />
      )}

      <form
        onSubmit={handleSubmit((vals) => saveMut.mutate(vals))}
        className="cw-card p-[24px] space-y-[16px]"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
          <div>
            <label htmlFor="nickname" className="block text-[13px] font-medium mb-[6px]">
              Vehicle nickname
            </label>
            <input id="nickname" className="cw-input" {...register("nickname")} />
            {errors.nickname && (
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">{errors.nickname.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="model_year" className="block text-[13px] font-medium mb-[6px]">
              Model year
            </label>
            <input id="model_year" type="number" className="cw-input" {...register("model_year")} />
          </div>
          <div>
            <label htmlFor="manufacturer" className="block text-[13px] font-medium mb-[6px]">
              Manufacturer
            </label>
            <input id="manufacturer" className="cw-input" {...register("manufacturer")} />
          </div>
          <div>
            <label htmlFor="model" className="block text-[13px] font-medium mb-[6px]">
              Model
            </label>
            <input id="model" className="cw-input" {...register("model")} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="variant" className="block text-[13px] font-medium mb-[6px]">
              Variant
            </label>
            <input id="variant" className="cw-input" {...register("variant")} />
          </div>
          <div>
            <label htmlFor="battery_capacity_kwh" className="block text-[13px] font-medium mb-[6px]">
              Total battery capacity (kWh)
            </label>
            <input
              id="battery_capacity_kwh"
              type="number"
              step="0.1"
              className="cw-input"
              {...register("battery_capacity_kwh")}
            />
          </div>
          <div>
            <label htmlFor="usable_battery_kwh" className="block text-[13px] font-medium mb-[6px]">
              Usable battery capacity (kWh)
            </label>
            <input
              id="usable_battery_kwh"
              type="number"
              step="0.1"
              className="cw-input"
              {...register("usable_battery_kwh")}
            />
            {errors.usable_battery_kwh && (
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">
                {errors.usable_battery_kwh.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="consumption_kwh_per_100km" className="block text-[13px] font-medium mb-[6px]">
              Typical consumption (kWh / 100 km)
            </label>
            <input
              id="consumption_kwh_per_100km"
              type="number"
              step="0.1"
              className="cw-input"
              {...register("consumption_kwh_per_100km")}
            />
          </div>
          <div>
            <label htmlFor="specs_source" className="block text-[13px] font-medium mb-[6px]">
              Specification source
            </label>
            <select id="specs_source" className="cw-input" {...register("specs_source")}>
              <option value="oem_verified">OEM Verified</option>
              <option value="user_entered">User Entered</option>
              <option value="estimated">Estimated</option>
            </select>
          </div>
          <div>
            <label htmlFor="max_dc_power_kw" className="block text-[13px] font-medium mb-[6px]">
              Max DC charging power (kW)
            </label>
            <input
              id="max_dc_power_kw"
              type="number"
              step="0.5"
              className="cw-input"
              {...register("max_dc_power_kw")}
            />
            {errors.max_dc_power_kw && (
              <p className="text-[13px] text-[#121317] mt-[4px] mb-0">
                {errors.max_dc_power_kw.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="max_ac_power_kw" className="block text-[13px] font-medium mb-[6px]">
              Max AC charging power (kW)
            </label>
            <input
              id="max_ac_power_kw"
              type="number"
              step="0.1"
              className="cw-input"
              {...register("max_ac_power_kw")}
            />
          </div>
        </div>

        <div>
          <span className="block text-[13px] font-medium mb-[8px]">Supported connectors</span>
          <div className="flex flex-wrap gap-[8px]">
            {CONNECTOR_OPTIONS.map((conn) => {
              const active = selectedConnectors.includes(conn);
              return (
                <button
                  key={conn}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleConnector(conn)}
                  className={active ? "cw-btn-primary py-[6px] px-[12px]" : "cw-btn-secondary py-[6px] px-[12px]"}
                >
                  {conn}
                </button>
              );
            })}
          </div>
          {errors.connector_types && (
            <p className="text-[13px] text-[#121317] mt-[4px] mb-0">
              {errors.connector_types.message}
            </p>
          )}
        </div>

        <label className="flex items-center gap-[8px] text-[14px] text-[#121317]">
          <input type="checkbox" {...register("is_default")} />
          <span>Set as default vehicle for trip planning</span>
        </label>

        <div className="flex justify-end gap-[10px] pt-[8px]">
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
