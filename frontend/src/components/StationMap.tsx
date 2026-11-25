import L from "leaflet";
import { useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import { Link } from "react-router-dom";
import type { Station } from "../types/api";
import { VerificationBadge } from "./VerificationBadge";

function makeStationIcon(verified: boolean, label?: string) {
  const bg = verified
    ? "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)"
    : "linear-gradient(135deg, #475569 0%, #334155 100%)";
  const border = verified ? "#DBEAFE" : "#E2E8F0";
  const shadow = verified
    ? "0 4px 12px rgba(37, 99, 235, 0.42)"
    : "0 3px 10px rgba(15, 23, 42, 0.22)";
  const text = label || "⚡";
  return L.divIcon({
    className: "cw-map-pin",
    html: `<div style="background:${bg};color:#FFFFFF;border:2px solid ${border};border-radius:999px;min-width:30px;height:30px;padding:0 7px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:${shadow};font-family:'Plus Jakarta Sans','Inter',sans-serif;">${text}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function makeClusterIcon(count: number) {
  return L.divIcon({
    className: "cw-map-cluster",
    html: `<div style="background:rgba(219,234,254,0.92);backdrop-filter:blur(8px);color:#1E40AF;border:2px solid #2563EB;border-radius:999px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(37,99,235,0.28);font-family:'Plus Jakarta Sans','Inter',sans-serif;">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function StationMap({
  stations,
  center = [12.97, 76.2],
  zoom = 7,
  height = "460px",
  clusterThreshold = 45,
}: {
  stations: Station[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  clusterThreshold?: number;
}) {
  // Deterministic grid clustering when station count is dense (e.g., Bengaluru urban cluster)
  const displayItems = useMemo(() => {
    if (stations.length <= clusterThreshold) {
      return stations.map((s) => ({ type: "single" as const, station: s }));
    }
    const buckets = new Map<string, Station[]>();
    for (const s of stations) {
      const key = `${(Math.round(s.latitude * 12) / 12).toFixed(3)}_${(
        Math.round(s.longitude * 12) / 12
      ).toFixed(3)}`;
      const list = buckets.get(key) || [];
      list.push(s);
      buckets.set(key, list);
    }
    const out: Array<
      | { type: "single"; station: Station }
      | { type: "cluster"; lat: number; lon: number; stations: Station[] }
    > = [];
    for (const list of buckets.values()) {
      if (list.length === 1) {
        out.push({ type: "single", station: list[0] });
      } else {
        const lat = list.reduce((acc, x) => acc + x.latitude, 0) / list.length;
        const lon = list.reduce((acc, x) => acc + x.longitude, 0) / list.length;
        out.push({ type: "cluster", lat, lon, stations: list });
      }
    }
    return out;
  }, [stations, clusterThreshold]);

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-[16px]">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={
            import.meta.env.VITE_MAP_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        {displayItems.map((item, idx) => {
          if (item.type === "cluster") {
            return (
              <Marker
                key={`cluster-${idx}`}
                position={[item.lat, item.lon]}
                icon={makeClusterIcon(item.stations.length)}
              >
                <Popup>
                  <div className="text-[13px] max-w-[240px]">
                    <p className="font-semibold text-[#121317] m-0">
                      {item.stations.length} stations in this zone
                    </p>
                    <ul className="mt-[6px] mb-0 pl-[16px] space-y-[4px]">
                      {item.stations.slice(0, 5).map((st) => (
                        <li key={st.id}>
                          <Link
                            to={`/stations/${st.id}`}
                            className="underline text-[#121317]"
                          >
                            {st.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </Marker>
            );
          }

          const s = item.station;
          const isVer =
            s.verification_status === "operational_status_verified" ||
            s.verification_status === "live_availability_confirmed" ||
            s.verification_status === "location_verified";
          const maxKw = Math.max(
            0,
            ...s.connectors.map((c) => c.power_kw || 0)
          );
          return (
            <Marker
              key={s.id}
              position={[s.latitude, s.longitude]}
              icon={makeStationIcon(isVer, maxKw > 0 ? `${Math.round(maxKw)}` : "⚡")}
            >
              <Popup>
                <div className="text-[13px] min-w-[200px] space-y-[6px]">
                  <p className="font-semibold text-[#121317] m-0">{s.name}</p>
                  <p className="text-[#45474D] m-0">
                    {s.operator?.name || "Independent"} · {s.city}
                  </p>
                  <VerificationBadge status={s.verification_status} />
                  <div className="pt-[4px]">
                    <Link
                      to={`/stations/${s.id}`}
                      className="cw-btn-primary py-[5px] px-[12px] text-[12px]"
                      style={{ color: "#FFFFFF" }}
                    >
                      View station
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
