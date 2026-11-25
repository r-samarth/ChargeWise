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
      <div className="max-w-[1120px] mx-auto px-4 py-12">
        <div className="cw-card p-6 text-[#475569]">Loading station intelligence...</div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-12 space-y-4">
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
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={station.verification_status} />
            <span className="cw-pill cw-pill-accent cw-num">
              Confidence {Math.round(station.confidence_score * 100)}% · {station.source_records_count} source record(s)
            </span>
            {station.is_stale && (
              <span className="cw-pill cw-pill-warning">Data refresh recommended</span>
            )}
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#0F172A] leading-tight">
            {station.name}
          </h1>
          <p className="text-[15px] text-[#334155] leading-relaxed">{station.address}</p>
          <p className="text-[13px] text-[#64748B] cw-num">
            Coordinates: {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)} · Last verified:{" "}
            {station.last_verified_at
              ? new Date(station.last_verified_at).toLocaleDateString()
              : "Unverified"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Connectors & Metadata */}
        <div className="lg:col-span-7 space-y-5">
          <section className="cw-card p-6 space-y-4">
            <h2 className="text-[18px] font-bold text-[#0F172A]">Charging Connectors</h2>
            <div className="space-y-2.5">
              {station.connectors.map((c) => (
                <div
                  key={c.id}
                  className="cw-card-muted p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-0.5">
                    <p className="text-[15px] font-semibold text-[#0F172A] cw-num">
                      {c.connector_type} ({c.current_type}) · {c.connector_count} port(s)
                    </p>
                    <p className="text-[13px] text-[#475569] cw-num">
                      Rated Power: {c.power_kw ? `${c.power_kw} kW` : "Information unavailable"} · Operational:{" "}
                      {c.operational_status}
                    </p>
                  </div>
                  <AvailabilityBadge status={c.availability_status} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[13.5px]">
              <div className="cw-card-muted p-3.5 space-y-0.5">
                <span className="text-[#64748B] text-[12px] block">Opening hours</span>
                <strong className="text-[#0F172A] font-semibold">
                  {station.opening_hours || "Information unavailable"}
                </strong>
              </div>
              <div className="cw-card-muted p-3.5 space-y-0.5">
                <span className="text-[#64748B] text-[12px] block">Pricing</span>
                <strong className="text-[#0F172A] font-semibold">
                  {station.pricing_verified && station.pricing_info
                    ? station.pricing_info
                    : "Unverified — check official operator app"}
                </strong>
              </div>
            </div>
          </section>

          {/* Operator Integration */}
          <section className="cw-card p-6 space-y-3">
            <h2 className="text-[18px] font-bold text-[#0F172A]">
              Operator Integration & Support
            </h2>
            {station.operator ? (
              <div className="space-y-2.5 text-[14px]">
                <p className="font-semibold text-[#0F172A]">{station.operator.name}</p>
                <p className="text-[#334155]">
                  <strong className="text-[#0F172A]">Payments:</strong>{" "}
                  {station.operator.payment_information || "Check operator app"}
                </p>
                <p className="text-[#334155]">
                  <strong className="text-[#0F172A]">Reservations:</strong>{" "}
                  {station.operator.reservation_support} · {station.operator.api_or_ocpi_information}
                </p>
                <p className="text-[13px] text-[#64748B]">
                  ChargeWise does not process payments or reservations directly. Use the official links below and search for “{station.name}”.
                </p>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {station.operator.official_website && (
                    <a
                      href={station.operator.official_website}
                      target="_blank"
                      rel="noreferrer"
                      className="cw-btn-secondary !py-1.5 !px-3.5"
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
                      className="cw-btn-secondary !py-1.5 !px-3.5"
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
                      className="cw-btn-secondary !py-1.5 !px-3.5"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>iOS App</span>
                    </a>
                  )}
                  {station.operator.support_phone && (
                    <a
                      href={`tel:${station.operator.support_phone}`}
                      className="cw-btn-secondary !py-1.5 !px-3.5 cw-num"
                    >
                      <Phone size={14} aria-hidden="true" />
                      <span>{station.operator.support_phone}</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-[#475569]">
                Operator details unavailable. Source: {station.source}.
              </p>
            )}
          </section>
        </div>

        {/* Map & Nearby Amenities */}
        <div className="lg:col-span-5 space-y-5">
          <div className="cw-card p-3.5">
            <StationMap
              stations={[station]}
              center={[station.latitude, station.longitude]}
              zoom={13}
              height="270px"
            />
          </div>

          <section className="cw-card p-6 space-y-3">
            <h2 className="text-[18px] font-bold text-[#0F172A]">Nearby Family Amenities</h2>
            {station.nearby_amenities.length === 0 ? (
              <p className="text-[14px] text-[#64748B]">
                Information unavailable for verified amenities within 5 km.
              </p>
            ) : (
              <div className="space-y-2.5">
                {station.nearby_amenities.map((am) => (
                  <div key={am.id} className="cw-card-muted p-3.5 text-[13px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#0F172A] font-semibold">{am.name}</strong>
                      <span className="cw-pill cw-pill-accent">{am.category}</span>
                    </div>
                    <p className="text-[#475569] cw-num">
                      {am.distance_km} km away · Hours: {am.opening_hours || "Information unavailable"}
                    </p>
                    <p className="text-[#64748B] cw-num">
                      Rating: {am.rating !== null ? `${am.rating} / 5` : "Information unavailable"}
                    </p>
                    {am.navigation_url && (
                      <a
                        href={am.navigation_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-[#1D4ED8] hover:underline"
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
