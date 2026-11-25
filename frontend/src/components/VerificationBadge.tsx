import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  MapPin,
  Radio,
} from "lucide-react";

const LABELS: Record<
  string,
  { label: string; style: "verified" | "accent" | "muted" }
> = {
  live_availability_confirmed: {
    label: "Live Availability Confirmed",
    style: "verified",
  },
  operational_status_verified: {
    label: "Operational Status Verified",
    style: "verified",
  },
  location_verified: {
    label: "Location Verified",
    style: "accent",
  },
  listed: {
    label: "Listed (Unverified)",
    style: "muted",
  },
  temporarily_unavailable: {
    label: "Temporarily Unavailable",
    style: "muted",
  },
  unknown_or_stale: {
    label: "Unknown or Stale",
    style: "muted",
  },
};

export function VerificationBadge({ status }: { status: string }) {
  const cfg = LABELS[status] || {
    label: status.replace(/_/g, " "),
    style: "muted" as const,
  };

  const cls =
    cfg.style === "verified"
      ? "cw-pill cw-pill-verified"
      : cfg.style === "accent"
      ? "cw-pill cw-pill-accent"
      : "cw-pill";

  const Icon =
    status === "live_availability_confirmed"
      ? Radio
      : status === "operational_status_verified"
      ? CheckCircle2
      : status === "location_verified"
      ? MapPin
      : status === "temporarily_unavailable"
      ? AlertTriangle
      : status === "unknown_or_stale"
      ? Clock
      : HelpCircle;

  return (
    <span className={cls} title={`Verification status: ${cfg.label}`}>
      <Icon size={12} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}

export function AvailabilityBadge({ status }: { status: string }) {
  const normalized = (status || "unknown").toLowerCase();
  const text =
    normalized === "available"
      ? "Live: Available"
      : normalized === "occupied"
      ? "Live: Occupied"
      : normalized === "unavailable"
      ? "Unavailable"
      : "Live Status: Unknown";

  return (
    <span
      className={normalized === "available" ? "cw-pill cw-pill-verified" : "cw-pill"}
      title="ChargeWise never fabricates live charger occupancy."
    >
      {text}
    </span>
  );
}
