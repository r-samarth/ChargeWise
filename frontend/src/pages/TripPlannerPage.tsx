import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Sliders } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { KARNATAKA_PLACES } from "../constants/karnatakaPlaces";
import { apiRequest } from "../lib/api";
import { useTripStore } from "../store/tripStore";
import type { TripPlanResponse, Vehicle } from "../types/api";

const AMENITY_CHOICES = [
  { id: "restaurant", label: "Restaurants" },
  { id: "cafe", label: "Cafes" },
  { id: "washroom", label: "Washrooms" },
  { id: "hotel", label: "Hotels" },
  { id: "hospital", label: "Hospitals" },
  { id: "shopping", label: "Malls / Shopping" },
];

export function TripPlannerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setLastPlannedTrip = useTripStore((s) => s.setLastPlannedTrip);

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest<Vehicle[]>("/vehicles", { authRequired: true }),
  });

  const [vehicleId, setVehicleId] = useState("");
  const [originPlace, setOriginPlace] = useState("Mysuru");
  const [destPlace, setDestPlace] = useState("Mangaluru");
  const [customCoords, setCustomCoords] = useState(false);
  const [originLat, setOriginLat] = useState(12.304146);
  const [originLon, setOriginLon] = useState(76.652952);
  const [destLat, setDestLat] = useState(12.869825);
  const [destLon, setDestLon] = useState(74.843013);
  const [startSoc, setStartSoc] = useState(75);
  const [targetSoc, setTargetSoc] = useState(25);
  const [reserveSoc, setReserveSoc] = useState(12);
  const [maxDetourKm, setMaxDetourKm] = useState(12);
  const [maxStops, setMaxStops] = useState<string>("");
  const [preferFastDc, setPreferFastDc] = useState(true);
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [saveTrip, setSaveTrip] = useState(true);
  const [amenities, setAmenities] = useState<string[]>(["restaurant", "washroom"]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const preselected = params.get("vehicle");
    if (preselected && vehicles.some((v) => v.id === preselected)) {
      setVehicleId(preselected);
    } else if (vehicles.length > 0 && !vehicleId) {
      const def = vehicles.find((v) => v.is_default) || vehicles[0];
      setVehicleId(def.id);
    }
  }, [vehicles, params, vehicleId]);

  const handlePlaceChange = (kind: "origin" | "dest", name: string) => {
    const found = KARNATAKA_PLACES.find((p) => p.name === name);
    if (kind === "origin") {
      setOriginPlace(name);
      if (found) {
        setOriginLat(found.lat);
        setOriginLon(found.lon);
      }
    } else {
      setDestPlace(name);
      if (found) {
        setDestLat(found.lat);
        setDestLon(found.lon);
      }
    }
  };

  const toggleAmenity = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const planMut = useMutation({
    mutationFn: () =>
      apiRequest<TripPlanResponse>("/trips/plan", {
        method: "POST",
        authRequired: true,
        body: {
          vehicle_id: vehicleId,
          origin_name: originPlace,
          origin_lat: Number(originLat),
          origin_lon: Number(originLon),
          destination_name: destPlace,
          destination_lat: Number(destLat),
          destination_lon: Number(destLon),
          start_soc_pct: Number(startSoc),
          target_arrival_soc_pct: Number(targetSoc),
          reserve_soc_pct: Number(reserveSoc),
          max_stops: maxStops === "" ? null : Number(maxStops),
          max_detour_km: Number(maxDetourKm),
          prefer_fast_dc: preferFastDc,
          preferred_amenities: amenities,
          include_unverified_stations: includeUnverified,
          save_trip: saveTrip,
        },
      }),
    onSuccess: (res) => {
      setLastPlannedTrip(res);
      if (res.id) {
        navigate(`/trips/${res.id}`);
      } else {
        navigate("/trips/preview");
      }
    },
    onError: (err) => setErrorMsg((err as Error).message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!vehicleId) {
      setErrorMsg("Select or add a vehicle first.");
      return;
    }
    if (originPlace === destPlace && Math.abs(originLat - destLat) < 0.01) {
      setErrorMsg("Origin and destination must be different locations.");
      return;
    }
    planMut.mutate();
  };

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="space-y-1.5">
        <span className="cw-pill cw-pill-accent">Deterministic Karnataka Optimizer</span>
        <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
          Smart EV Trip Planner
        </h1>
        <p className="text-[15px] text-[#475569]">
          Plans connector-compatible routes with Western Ghats elevation adjustments and family-friendly charging stops.
        </p>
      </div>

      {!loadingVehicles && vehicles.length === 0 && (
        <StatusAlert
          title="Add an EV before planning"
          message="Your garage is empty. Add your vehicle (for example Tata Nexon.ev or Tiago.ev) so ChargeWise can check battery range and connector compatibility."
          action={
            <Link to="/vehicles/new" className="cw-btn-primary">
              Add EV
            </Link>
          }
        />
      )}

      {errorMsg && <StatusAlert title="Cannot plan trip" message={errorMsg} variant="error" />}

      <form onSubmit={handleSubmit} className="cw-card p-6 sm:p-8 space-y-6">
        {/* Vehicle */}
        <div>
          <label htmlFor="vehicleId" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
            Select vehicle
          </label>
          <select
            id="vehicleId"
            className="cw-input"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            disabled={vehicles.length === 0}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nickname} — {v.manufacturer} {v.model} ({v.usable_battery_kwh} kWh ·{" "}
                {v.connector_types.join(", ")})
              </option>
            ))}
          </select>
        </div>

        {/* Route Endpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="originPlace" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Origin (Karnataka)
            </label>
            <select
              id="originPlace"
              className="cw-input"
              value={originPlace}
              onChange={(e) => handlePlaceChange("origin", e.target.value)}
            >
              {KARNATAKA_PLACES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.district})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="destPlace" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Destination (Karnataka)
            </label>
            <select
              id="destPlace"
              className="cw-input"
              value={destPlace}
              onChange={(e) => handlePlaceChange("dest", e.target.value)}
            >
              {KARNATAKA_PLACES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.district})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setCustomCoords((v) => !v)}
            className="cw-btn-secondary !py-1.5 !px-3.5"
          >
            <Sliders size={14} aria-hidden="true" />
            <span>{customCoords ? "Hide exact coordinates" : "Customize exact coordinates"}</span>
          </button>

          {customCoords && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 cw-card-muted p-4">
              <div>
                <label htmlFor="originLat" className="block text-[11.5px] font-medium text-[#64748B] mb-1">
                  Origin Lat
                </label>
                <input
                  id="originLat"
                  type="number"
                  step="0.0001"
                  className="cw-input cw-num"
                  value={originLat}
                  onChange={(e) => setOriginLat(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="originLon" className="block text-[11.5px] font-medium text-[#64748B] mb-1">
                  Origin Lon
                </label>
                <input
                  id="originLon"
                  type="number"
                  step="0.0001"
                  className="cw-input cw-num"
                  value={originLon}
                  onChange={(e) => setOriginLon(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="destLat" className="block text-[11.5px] font-medium text-[#64748B] mb-1">
                  Dest Lat
                </label>
                <input
                  id="destLat"
                  type="number"
                  step="0.0001"
                  className="cw-input cw-num"
                  value={destLat}
                  onChange={(e) => setDestLat(Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="destLon" className="block text-[11.5px] font-medium text-[#64748B] mb-1">
                  Dest Lon
                </label>
                <input
                  id="destLon"
                  type="number"
                  step="0.0001"
                  className="cw-input cw-num"
                  value={destLon}
                  onChange={(e) => setDestLon(Number(e.target.value))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Battery SOC */}
        <div className="cw-card-muted p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <label htmlFor="startSoc" className="block text-[13px] font-medium text-[#334155] mb-2">
              Current battery SOC: <strong className="text-[#1D4ED8] cw-num">{startSoc}%</strong>
            </label>
            <input
              id="startSoc"
              type="range"
              min={10}
              max={100}
              value={startSoc}
              onChange={(e) => setStartSoc(Number(e.target.value))}
              className="w-full accent-[#2563EB]"
            />
          </div>
          <div>
            <label htmlFor="targetSoc" className="block text-[13px] font-medium text-[#334155] mb-2">
              Desired arrival SOC: <strong className="text-[#1D4ED8] cw-num">{targetSoc}%</strong>
            </label>
            <input
              id="targetSoc"
              type="range"
              min={10}
              max={80}
              value={targetSoc}
              onChange={(e) => setTargetSoc(Number(e.target.value))}
              className="w-full accent-[#2563EB]"
            />
          </div>
          <div>
            <label htmlFor="reserveSoc" className="block text-[13px] font-medium text-[#334155] mb-2">
              Safety reserve buffer: <strong className="text-[#0F766E] cw-num">{reserveSoc}%</strong>
            </label>
            <input
              id="reserveSoc"
              type="range"
              min={5}
              max={30}
              value={reserveSoc}
              onChange={(e) => setReserveSoc(Number(e.target.value))}
              className="w-full accent-[#0D9488]"
            />
          </div>
        </div>

        {/* Routing Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxDetour" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Maximum corridor detour (km)
            </label>
            <input
              id="maxDetour"
              type="number"
              min={1}
              max={50}
              className="cw-input cw-num"
              value={maxDetourKm}
              onChange={(e) => setMaxDetourKm(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="maxStops" className="block text-[13px] font-semibold text-[#1E293B] mb-1.5">
              Maximum charging stops
            </label>
            <select
              id="maxStops"
              className="cw-input"
              value={maxStops}
              onChange={(e) => setMaxStops(e.target.value)}
            >
              <option value="">Optimize automatically</option>
              <option value="0">0 stops (direct only)</option>
              <option value="1">Up to 1 stop</option>
              <option value="2">Up to 2 stops</option>
              <option value="3">Up to 3 stops</option>
            </select>
          </div>
        </div>

        <div>
          <span className="block text-[13px] font-semibold text-[#1E293B] mb-2">
            Preferred family amenities near charging stops
          </span>
          <div className="flex flex-wrap gap-2">
            {AMENITY_CHOICES.map((a) => {
              const active = amenities.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleAmenity(a.id)}
                  className={
                    active
                      ? "cw-btn-primary !py-1.5 !px-3.5"
                      : "cw-btn-secondary !py-1.5 !px-3.5"
                  }
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1 text-[#334155]">
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              className="accent-[#2563EB] w-4 h-4"
              checked={preferFastDc}
              onChange={(e) => setPreferFastDc(e.target.checked)}
            />
            <span>Prefer DC fast chargers</span>
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              className="accent-[#2563EB] w-4 h-4"
              checked={includeUnverified}
              onChange={(e) => setIncludeUnverified(e.target.checked)}
            />
            <span>Include unverified listed chargers</span>
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              className="accent-[#2563EB] w-4 h-4"
              checked={saveTrip}
              onChange={(e) => setSaveTrip(e.target.checked)}
            />
            <span>Save to my Saved Journeys</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={planMut.isPending || vehicles.length === 0}
            className="cw-btn-primary"
          >
            <span>{planMut.isPending ? "Calculating optimal route..." : "Calculate Smart Route"}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
