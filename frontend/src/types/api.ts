export interface UserProfile {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  role: string;
  account_status: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  preferredUnits: "metric" | "imperial";
  preferredMapStyle: "standard" | "terrain";
  preferredRouteSettings: {
    reserveSocPct: number;
    preferFastChargers: boolean;
    maxDetourKm: number;
    preferredAmenities: string[];
  };
  preferredNotificationSettings: {
    tripReminders: boolean;
    dataAlerts: boolean;
    emailDigest: boolean;
  };
  updatedAt: string | null;
  firestoreAvailable: boolean;
}

export interface VehicleCatalogItem {
  id: string;
  manufacturer: string;
  model: string;
  variant: string;
  model_year: number;
  battery_capacity_kwh: number;
  usable_battery_kwh: number;
  consumption_kwh_per_100km: number;
  connector_types: string[];
  max_ac_power_kw: number;
  max_dc_power_kw: number;
  specs_source: string;
  specs_notes: string | null;
}

export interface Vehicle {
  id: string;
  user_id: string;
  nickname: string;
  manufacturer: string;
  model: string;
  variant: string;
  model_year: number;
  battery_capacity_kwh: number;
  usable_battery_kwh: number;
  consumption_kwh_per_100km: number;
  connector_types: string[];
  max_ac_power_kw: number;
  max_dc_power_kw: number;
  specs_source: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Operator {
  id: string;
  slug: string;
  name: string;
  official_website: string | null;
  android_app_url: string | null;
  ios_app_url: string | null;
  support_phone: string | null;
  support_email: string | null;
  payment_information: string | null;
  reservation_support: string;
  api_or_ocpi_information: string | null;
}

export interface Connector {
  id: string;
  station_id: string;
  connector_type: string;
  current_type: string;
  power_kw: number | null;
  connector_count: number;
  operational_status: string;
  availability_status: string;
  availability_updated_at: string | null;
}

export interface Amenity {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  opening_hours: string | null;
  rating: number | null;
  family_friendly_tags: string[];
  source: string;
  distance_km: number | null;
  navigation_url: string | null;
}

export interface Station {
  id: string;
  name: string;
  operator_id: string | null;
  operator: Operator | null;
  address: string;
  city: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  charging_type: string;
  opening_hours: string | null;
  pricing_info: string | null;
  pricing_verified: boolean;
  amenities_summary: string[];
  official_station_url: string | null;
  phone: string | null;
  source: string;
  source_id: string;
  verification_status: string;
  confidence_score: number;
  last_verified_at: string | null;
  data_updated_at: string | null;
  is_active: boolean;
  connectors: Connector[];
  distance_km: number | null;
  navigation_url: string | null;
  trust_note: string | null;
}

export interface StationDetail extends Station {
  nearby_amenities: Amenity[];
  source_records_count: number;
  is_stale: boolean;
}

export interface StationList {
  items: Station[];
  total: number;
  page: number;
  page_size: number;
}

export interface TripStop {
  id: string | null;
  stop_order: number;
  station_id: string | null;
  connector_id: string | null;
  station_name: string;
  city: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  connector_type: string;
  rated_power_kw: number;
  effective_power_kw: number;
  verification_status: string;
  availability_status: string;
  distance_from_origin_km: number;
  detour_km: number;
  arrival_soc_pct: number;
  departure_soc_pct: number;
  energy_added_kwh: number;
  estimated_charge_minutes: number;
  selection_reason: string;
  navigation_url: string;
  operator: Operator | null;
  nearby_amenities: Amenity[];
  alternatives: Array<{
    station_id: string;
    name: string;
    city: string;
    distance_from_origin_km: number;
    connector_type: string;
    power_kw: number;
    verification_status: string;
  }>;
  is_backup: boolean;
}

export interface SocProfilePoint {
  label: string;
  distance_km: number;
  soc_pct: number;
  elevation_m: number | null;
}

export interface TripPlanResponse {
  id: string | null;
  feasible: boolean;
  failure_reason: string | null;
  title: string;
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  start_soc_pct: number;
  target_arrival_soc_pct: number;
  reserve_soc_pct: number;
  total_distance_km: number;
  estimated_drive_minutes: number;
  estimated_charge_minutes: number;
  total_trip_minutes: number;
  total_energy_kwh: number;
  arrival_soc_pct: number;
  remaining_range_km: number;
  routing_source: string;
  elevation_adjusted: boolean;
  route_geojson: {
    type: string;
    geometry: {
      type: string;
      coordinates: number[][];
    };
  };
  explanation_summary: string;
  assumptions: string[];
  limitations: string[];
  stops: TripStop[];
  soc_profile: SocProfilePoint[];
  is_saved: boolean;
  created_at: string | null;
}

export interface TripSummary {
  id: string;
  title: string;
  vehicle_id: string | null;
  origin_name: string;
  destination_name: string;
  start_soc_pct: number;
  target_arrival_soc_pct: number;
  total_distance_km: number;
  estimated_drive_minutes: number;
  estimated_charge_minutes: number;
  total_energy_kwh: number;
  arrival_soc_pct: number;
  routing_source: string;
  is_saved: boolean;
  status: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string | null;
  relatedEntityId: string | null;
  deepLink: string | null;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string | null;
  relatedEntityId: string | null;
  metadata: Record<string, unknown>;
}

export interface AnalyticsOverview {
  total_stations: number;
  total_connectors: number;
  total_operators: number;
  stations_by_district: Array<{ district: string; count: number }>;
  stations_by_operator: Array<{ operator: string; count: number }>;
  connectors_by_type: Array<{ connector_type: string; count: number }>;
  power_kw_distribution: Array<{ bucket: string; count: number }>;
  verification_breakdown: Array<{ status: string; count: number }>;
  karnataka_ev_benchmark: Record<string, string | number>;
}

export interface DataQualityMetrics {
  total_stations: number;
  active_stations: number;
  total_connectors: number;
  total_operators: number;
  total_amenities: number;
  verification_breakdown: Record<string, number>;
  stale_stations_count: number;
  missing_opening_hours_count: number;
  unverified_pricing_count: number;
  pending_duplicate_reviews: number;
  failed_outbox_events: number;
}
