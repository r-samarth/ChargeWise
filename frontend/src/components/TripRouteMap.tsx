import L from "leaflet";
import { useMemo } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from "react-leaflet";
import type { TripPlanResponse } from "../types/api";

function makePin(text: string, dark = true) {
  return L.divIcon({
    className: "cw-route-pin",
    html: `<div style="background:${dark ? "#121317" : "#FFFFFF"};color:${dark ? "#FFFFFF" : "#121317"};border:2px solid ${dark ? "#B7BFD9" : "#121317"};border-radius:999px;padding:2px 10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(18,19,23,0.18);font-family:'Google Sans Flex',sans-serif;">${text}</div>`,
    iconSize: [28, 24],
    iconAnchor: [14, 12],
  });
}

export function TripRouteMap({
  trip,
  height = "420px",
}: {
  trip: TripPlanResponse;
  height?: string;
}) {
  const polylineCoords = useMemo<[number, number][]>(() => {
    const coords = trip.route_geojson?.geometry?.coordinates || [];
    if (!coords.length) {
      return [
        [trip.origin_lat, trip.origin_lon],
        ...trip.stops.map((s) => [s.latitude, s.longitude] as [number, number]),
        [trip.destination_lat, trip.destination_lon],
      ];
    }
    return coords.map(([lon, lat]) => [lat, lon] as [number, number]);
  }, [trip]);

  const center: [number, number] = [
    (trip.origin_lat + trip.destination_lat) / 2,
    (trip.origin_lon + trip.destination_lon) / 2,
  ];

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-[16px]">
      <MapContainer
        center={center}
        zoom={8}
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
        <Polyline
          positions={polylineCoords}
          pathOptions={{ color: "#121317", weight: 4, opacity: 0.9 }}
        />

        <Marker
          position={[trip.origin_lat, trip.origin_lon]}
          icon={makePin(`Start: ${trip.origin_name}`, false)}
        >
          <Popup>
            <strong>Origin:</strong> {trip.origin_name} ({trip.start_soc_pct}% SOC)
          </Popup>
        </Marker>

        {trip.stops.map((stop) => (
          <Marker
            key={`${stop.stop_order}-${stop.station_name}`}
            position={[stop.latitude, stop.longitude]}
            icon={makePin(`Stop ${stop.stop_order} · ${Math.round(stop.effective_power_kw)}kW`, true)}
          >
            <Popup>
              <div className="text-[13px] space-y-[4px]">
                <p className="font-semibold m-0">{stop.station_name}</p>
                <p className="m-0 text-[#45474D]">
                  Arrive {stop.arrival_soc_pct}% → Charge {stop.estimated_charge_minutes} min → Depart {stop.departure_soc_pct}%
                </p>
                <a
                  href={stop.navigation_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-[#121317]"
                >
                  Navigate with Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        <Marker
          position={[trip.destination_lat, trip.destination_lon]}
          icon={makePin(`End: ${trip.destination_name}`, false)}
        >
          <Popup>
            <strong>Destination:</strong> {trip.destination_name} (Est. {trip.arrival_soc_pct}% SOC)
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
