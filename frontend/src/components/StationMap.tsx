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
  const bg = verified ? "#121317" : "#45474D";
  const border = verified ? "#B7BFD9" : "#E6EAF0";
  const text = label || "⚡";
  return L.divIcon({
    className: "cw-map-pin",
    html: `<div style="background:${bg};color:#FFFFFF;border:2px solid ${border};border-radius:999px;min-width:28px;height:28px;padding:0 6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;box-shadow:0 2px 8px rgba(18,19,23,0.18);font-family:'Google Sans Flex',sans-serif;">${text}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeClusterIcon(count: number) {
  return L.divIcon({
    className: "cw-map-cluster",
    html: `<div style="background:#B7BFD9;color:#121317;border:2px solid #121317;border-radius:999px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(18,19,23,0.16);font-family:'Google Sans Flex',sans-serif;">${count}</div>`,
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
