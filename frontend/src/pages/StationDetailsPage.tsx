import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin, Navigation, Phone } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { StationMap } from "../components/StationMap";
import { StatusAlert } from "../components/StatusAlert";
import { AvailabilityBadge, VerificationBadge } from "../components/VerificationBadge";
import { apiRequest } from "../lib/api";
import type { StationDetail } from "../types/api";

export function StationDetailsPage() {
  const { id } = useParams();
  const { data: station, isLoading, error } = useQuery({
    queryKey: ["station-detail", id],
    queryFn: () => apiRequest<StationDetail>(`/stations/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="max-w-[1120px] mx-auto px-[16px] py-[48px]">
        <div className="cw-card p-[24px] text-[#45474D]">Loading station intelligence...</div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="max-w-[900px] mx-auto px-[16px] py-[48px] space-y-[16px]">
        <StatusAlert
          title="Station not found"
          message={(error as Error)?.message || "Could not locate charging station."}
          variant="error"
        />
        <Link to="/stations" className="cw-btn-secondary">
          Back to Explorer
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1180px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-[16px]">
        <div className="space-y-[8px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            <VerificationBadge status={station.verification_status} />
            <span className="cw-pill">
              Confidence {Math.round(station.confidence_score * 100)}% · {station.source_records_count} source record(s)
            </span>
            {station.is_stale && <span className="cw-pill">Data refresh recommended</span>}
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-semibold text-[#121317] m-0">
            {station.name}
          </h1>
          <p className="text-[15px] text-[#45474D] m-0">{station.address}</p>
          <p className="text-[13px] text-[#6A6A71] m-0">
            Coordinates: {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)} · Last verified:{" "}
            {station.last_verified_at
              ? new Date(station.last_verified_at).toLocaleDateString()
              : "Unverified"}
          </p>
        </div>

        <div className="flex flex-wrap gap-[10px]">
          {station.navigation_url && (
            <a
              href={station.navigation_url}
              target="_blank"
              rel="noreferrer"
              className="cw-btn-primary"
            >
              <Navigation size={16} aria-hidden="true" />
              <span>Navigate</span>
            </a>
          )}
          <Link to="/stations" className="cw-btn-secondary">
            All Stations
          </Link>
        </div>
      </div>

      {station.trust_note && (
        <StatusAlert title="Verification & Availability Disclosure" message={station.trust_note} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[20px]">
        {/* Connectors & Metadata */}
        <div className="lg:col-span-7 space-y-[20px]">
          <section className="cw-card p-[24px] space-y-[14px]">
            <h2 className="text-[18px] font-semibold text-[#121317] m-0">
              Charging Connectors
            </h2>
            <div className="space-y-[10px]">
              {station.connectors.map((c) => (
                <div
                  key={c.id}
                  className="cw-card-muted p-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-[10px]"
                >
                  <div>
                    <p className="text-[15px] font-semibold text-[#121317] m-0">
                      {c.connector_type} ({c.current_type}) · {c.connector_count} port(s)
                    </p>
                    <p className="text-[13px] text-[#45474D] m-0">
                      Rated Power: {c.power_kw ? `${c.power_kw} kW` : "Information unavailable"} · Operational:{" "}
                      {c.operational_status}
                    </p>
                  </div>
                  <AvailabilityBadge status={c.availability_status} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] pt-[8px] text-[13px]">
              <div>
                <span className="text-[#6A6A71] block">Opening hours</span>
                <strong className="text-[#121317]">
                  {station.opening_hours || "Information unavailable"}
                </strong>
              </div>
              <div>
                <span className="text-[#6A6A71] block">Pricing</span>
                <strong className="text-[#121317]">
                  {station.pricing_verified && station.pricing_info
                    ? station.pricing_info
                    : "Unverified — check official operator app"}
                </strong>
              </div>
            </div>
          </section>

          {/* Operator Integration */}
          <section className="cw-card p-[24px] space-y-[12px]">
            <h2 className="text-[18px] font-semibold text-[#121317] m-0">
              Operator Integration & Support
            </h2>
            {station.operator ? (
              <div className="space-y-[10px] text-[14px]">
                <p className="m-0 font-medium text-[#121317]">{station.operator.name}</p>
                <p className="m-0 text-[#45474D]">
                  <strong>Payments:</strong>{" "}
                  {station.operator.payment_information || "Check operator app"}
                </p>
                <p className="m-0 text-[#45474D]">
                  <strong>Reservations:</strong> {station.operator.reservation_support} ·{" "}
                  {station.operator.api_or_ocpi_information}
                </p>
                <p className="m-0 text-[13px] text-[#6A6A71]">
                  ChargeWise does not process payments or reservations directly. Use the official links below and search for “{station.name}”.
                </p>
                <div className="flex flex-wrap gap-[8px] pt-[6px]">
                  {station.operator.official_website && (
                    <a
                      href={station.operator.official_website}
                      target="_blank"
                      rel="noreferrer"
                      className="cw-btn-secondary py-[6px] px-[12px]"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>Website</span>
                    </a>
                  )}
                  {station.operator.android_app_url && (
                    <a
                      href={station.operator.android_app_url}
                      target="_blank"
                      rel="noreferrer"
                      className="cw-btn-secondary py-[6px] px-[12px]"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>Android App</span>
                    </a>
                  )}
                  {station.operator.ios_app_url && (
                    <a
                      href={station.operator.ios_app_url}
                      target="_blank"
                      rel="noreferrer"
                      className="cw-btn-secondary py-[6px] px-[12px]"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>iOS App</span>
                    </a>
                  )}
                  {station.operator.support_phone && (
                    <a
                      href={`tel:${station.operator.support_phone}`}
                      className="cw-btn-secondary py-[6px] px-[12px]"
                    >
                      <Phone size={14} aria-hidden="true" />
                      <span>{station.operator.support_phone}</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-[#45474D] m-0">
                Operator details unavailable. Source: {station.source}.
              </p>
            )}
          </section>
        </div>

        {/* Map & Nearby Amenities */}
        <div className="lg:col-span-5 space-y-[20px]">
          <div className="cw-card p-[14px]">
            <StationMap
              stations={[station]}
              center={[station.latitude, station.longitude]}
              zoom={13}
              height="260px"
            />
          </div>

          <section className="cw-card p-[24px] space-y-[12px]">
            <h2 className="text-[18px] font-semibold text-[#121317] m-0">
              Nearby Family Amenities
            </h2>
            {station.nearby_amenities.length === 0 ? (
              <p className="text-[14px] text-[#6A6A71] m-0">
                Information unavailable for verified amenities within 5 km.
              </p>
            ) : (
              <div className="space-y-[10px]">
                {station.nearby_amenities.map((am) => (
                  <div key={am.id} className="cw-card-muted p-[12px] text-[13px] space-y-[4px]">
                    <div className="flex items-center justify-between gap-[6px]">
                      <strong className="text-[#121317]">{am.name}</strong>
                      <span className="cw-pill">{am.category}</span>
                    </div>
                    <p className="text-[#45474D] m-0">
                      {am.distance_km} km away · Hours: {am.opening_hours || "Information unavailable"}
                    </p>
                    <p className="text-[#6A6A71] m-0">
                      Rating: {am.rating !== null ? `${am.rating} / 5` : "Information unavailable"}
                    </p>
                    {am.navigation_url && (
                      <a
                        href={am.navigation_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-[4px] text-[#121317] underline"
                      >
                        <MapPin size={12} aria-hidden="true" />
                        <span>Navigate to amenity</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
