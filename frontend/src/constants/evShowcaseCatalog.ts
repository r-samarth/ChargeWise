export type VehicleBodyArchetype =
  | "micro_hatch"
  | "hatchback"
  | "compact_suv"
  | "coupe_suv"
  | "midsize_suv"
  | "mpv"
  | "sedan"
  | "roadster"
  | "scooter"
  | "motorcycle";

export interface VehicleVisualProfile {
  archetype: VehicleBodyArchetype;
  category: "4W Car / SUV" | "4W Sedan / Coupe" | "2W Scooter / Bike";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ledSignature: "lightbar" | "c_blade" | "pixel" | "twin_pod" | "mono_drl";
  claimedRangeLabel: string;
  highlightTag: string;
}

const DEFAULT_PROFILE: VehicleVisualProfile = {
  archetype: "compact_suv",
  category: "4W Car / SUV",
  primaryColor: "#2563EB",
  secondaryColor: "#0F172A",
  accentColor: "#60A5FA",
  ledSignature: "lightbar",
  claimedRangeLabel: "400+ km",
  highlightTag: "CCS2 Fast DC",
};

const MODEL_PROFILES: Array<{ match: RegExp; profile: VehicleVisualProfile }> = [
  // Tata.ev
  {
    match: /tiago/i,
    profile: {
      archetype: "hatchback",
      category: "4W Car / SUV",
      primaryColor: "#0E9AA7",
      secondaryColor: "#0F172A",
      accentColor: "#38BDF8",
      ledSignature: "twin_pod",
      claimedRangeLabel: "250–315 km MIDC",
      highlightTag: "City Hatch EV",
    },
  },
  {
    match: /tigor/i,
    profile: {
      archetype: "sedan",
      category: "4W Sedan / Coupe",
      primaryColor: "#0F766E",
      secondaryColor: "#1E293B",
      accentColor: "#2DD4BF",
      ledSignature: "twin_pod",
      claimedRangeLabel: "315 km ARAI",
      highlightTag: "Compact EV Sedan",
    },
  },
  {
    match: /punch/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#94A3B8",
      secondaryColor: "#0F172A",
      accentColor: "#38BDF8",
      ledSignature: "lightbar",
      claimedRangeLabel: "315–421 km MIDC",
      highlightTag: "acti.ev Micro-SUV",
    },
  },
  {
    match: /nexon/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#5B3E8C",
      secondaryColor: "#0F172A",
      accentColor: "#A78BFA",
      ledSignature: "lightbar",
      claimedRangeLabel: "325–489 km MIDC",
      highlightTag: "India's #1 EV SUV",
    },
  },
  {
    match: /curvv/i,
    profile: {
      archetype: "coupe_suv",
      category: "4W Sedan / Coupe",
      primaryColor: "#C86D44",
      secondaryColor: "#0F172A",
      accentColor: "#FDBA74",
      ledSignature: "lightbar",
      claimedRangeLabel: "502–585 km MIDC",
      highlightTag: "SUV Coupe Fastback",
    },
  },
  {
    match: /harrier/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#E2E8F0",
      secondaryColor: "#0F172A",
      accentColor: "#38BDF8",
      ledSignature: "lightbar",
      claimedRangeLabel: "538–627 km MIDC",
      highlightTag: "Flagship QWD 120 kW",
    },
  },
  // Mahindra Born Electric & XUV
  {
    match: /xuv400/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#1E3A8A",
      secondaryColor: "#B45309",
      accentColor: "#F59E0B",
      ledSignature: "twin_pod",
      claimedRangeLabel: "375–456 km MIDC",
      highlightTag: "Torque-Rich SUV",
    },
  },
  {
    match: /be 6/i,
    profile: {
      archetype: "coupe_suv",
      category: "4W Car / SUV",
      primaryColor: "#EA580C",
      secondaryColor: "#0F172A",
      accentColor: "#FB923C",
      ledSignature: "c_blade",
      claimedRangeLabel: "557–682 km MIDC",
      highlightTag: "175 kW Ultra-Fast",
    },
  },
  {
    match: /xev 9e/i,
    profile: {
      archetype: "coupe_suv",
      category: "4W Sedan / Coupe",
      primaryColor: "#B91C1C",
      secondaryColor: "#0F172A",
      accentColor: "#FCA5A5",
      ledSignature: "c_blade",
      claimedRangeLabel: "542–656 km MIDC",
      highlightTag: "INGLO Coupe Flagship",
    },
  },
  // MG Motor
  {
    match: /comet/i,
    profile: {
      archetype: "micro_hatch",
      category: "4W Car / SUV",
      primaryColor: "#84CC16",
      secondaryColor: "#0F172A",
      accentColor: "#BEF264",
      ledSignature: "lightbar",
      claimedRangeLabel: "230 km (AC Only)",
      highlightTag: "Type-2 AC Micro-EV",
    },
  },
  {
    match: /windsor/i,
    profile: {
      archetype: "mpv",
      category: "4W Car / SUV",
      primaryColor: "#4D7C73",
      secondaryColor: "#0F172A",
      accentColor: "#5EEAD4",
      ledSignature: "lightbar",
      claimedRangeLabel: "332–449 km MIDC",
      highlightTag: "Aero-Lounge CUV",
    },
  },
  {
    match: /zs ev/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#CBD5E1",
      secondaryColor: "#1E293B",
      accentColor: "#38BDF8",
      ledSignature: "twin_pod",
      claimedRangeLabel: "461 km ICAT",
      highlightTag: "Touring SUV",
    },
  },
  {
    match: /cyberster/i,
    profile: {
      archetype: "roadster",
      category: "4W Sedan / Coupe",
      primaryColor: "#DC2626",
      secondaryColor: "#090D16",
      accentColor: "#F87171",
      ledSignature: "twin_pod",
      claimedRangeLabel: "580 km CLTC",
      highlightTag: "AWD Electric Roadster",
    },
  },
  // Hyundai
  {
    match: /creta electric/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#2563EB",
      secondaryColor: "#0F172A",
      accentColor: "#93C5FD",
      ledSignature: "pixel",
      claimedRangeLabel: "420–510 km MIDC",
      highlightTag: "Pixel SUV EV",
    },
  },
  {
    match: /kona/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#334155",
      secondaryColor: "#0F172A",
      accentColor: "#60A5FA",
      ledSignature: "twin_pod",
      claimedRangeLabel: "452 km ARAI",
      highlightTag: "Global Crossover",
    },
  },
  {
    match: /ioniq 5/i,
    profile: {
      archetype: "coupe_suv",
      category: "4W Car / SUV",
      primaryColor: "#C2B280",
      secondaryColor: "#0F172A",
      accentColor: "#E0F2FE",
      ledSignature: "pixel",
      claimedRangeLabel: "631 km ARAI",
      highlightTag: "800V E-GMP Ultra-Fast",
    },
  },
  // Kia
  {
    match: /carens clavis/i,
    profile: {
      archetype: "mpv",
      category: "4W Car / SUV",
      primaryColor: "#1D4ED8",
      secondaryColor: "#0F172A",
      accentColor: "#93C5FD",
      ledSignature: "c_blade",
      claimedRangeLabel: "404–490 km MIDC",
      highlightTag: "7-Seat Family MPV",
    },
  },
  {
    match: /ev6/i,
    profile: {
      archetype: "coupe_suv",
      category: "4W Sedan / Coupe",
      primaryColor: "#991B1B",
      secondaryColor: "#0F172A",
      accentColor: "#FCA5A5",
      ledSignature: "c_blade",
      claimedRangeLabel: "663 km MIDC",
      highlightTag: "350 kW 800V GT-Line",
    },
  },
  // BYD
  {
    match: /atto 3/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#0284C7",
      secondaryColor: "#1E293B",
      accentColor: "#7DD3FC",
      ledSignature: "lightbar",
      claimedRangeLabel: "521 km ARAI",
      highlightTag: "Blade LFP SUV",
    },
  },
  {
    match: /emax 7/i,
    profile: {
      archetype: "mpv",
      category: "4W Car / SUV",
      primaryColor: "#0F766E",
      secondaryColor: "#0F172A",
      accentColor: "#5EEAD4",
      ledSignature: "lightbar",
      claimedRangeLabel: "420–530 km NEDC",
      highlightTag: "eMPV 115 kW DC",
    },
  },
  {
    match: /sealion 7/i,
    profile: {
      archetype: "coupe_suv",
      category: "4W Sedan / Coupe",
      primaryColor: "#334155",
      secondaryColor: "#090D16",
      accentColor: "#38BDF8",
      ledSignature: "c_blade",
      claimedRangeLabel: "542–567 km NEDC",
      highlightTag: "230 kW Performance SUV",
    },
  },
  {
    match: /seal/i,
    profile: {
      archetype: "sedan",
      category: "4W Sedan / Coupe",
      primaryColor: "#1E40AF",
      secondaryColor: "#0F172A",
      accentColor: "#60A5FA",
      ledSignature: "c_blade",
      claimedRangeLabel: "580–650 km NEDC",
      highlightTag: "Ocean Blade Sedan",
    },
  },
  // Maruti Suzuki, Citroen, VinFast
  {
    match: /e vitara/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#3F6212",
      secondaryColor: "#0F172A",
      accentColor: "#A3E635",
      ledSignature: "twin_pod",
      claimedRangeLabel: "440–543 km MIDC",
      highlightTag: "HEARTECT-e SUV",
    },
  },
  {
    match: /ë-c3|ec3|e-c3/i,
    profile: {
      archetype: "hatchback",
      category: "4W Car / SUV",
      primaryColor: "#E11D48",
      secondaryColor: "#FFFFFF",
      accentColor: "#FDA4AF",
      ledSignature: "twin_pod",
      claimedRangeLabel: "320 km ARAI",
      highlightTag: "Urban Comfort EV",
    },
  },
  {
    match: /vf 6/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#0F766E",
      secondaryColor: "#0F172A",
      accentColor: "#2DD4BF",
      ledSignature: "c_blade",
      claimedRangeLabel: "468 km ARAI",
      highlightTag: "100 kW Fast SUV",
    },
  },
  {
    match: /vf 7/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#1E293B",
      secondaryColor: "#090D16",
      accentColor: "#60A5FA",
      ledSignature: "c_blade",
      claimedRangeLabel: "532 km ARAI",
      highlightTag: "350 bhp AWD SUV",
    },
  },
  // Luxury Euro
  {
    match: /ex30/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#BAE6FD",
      secondaryColor: "#0F172A",
      accentColor: "#38BDF8",
      ledSignature: "pixel",
      claimedRangeLabel: "480 km WLTP",
      highlightTag: "Nordic Compact EV",
    },
  },
  {
    match: /ex40|xc40/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#475569",
      secondaryColor: "#0F172A",
      accentColor: "#E0F2FE",
      ledSignature: "pixel",
      claimedRangeLabel: "505–592 km ICAT",
      highlightTag: "Twin Motor 150 kW",
    },
  },
  {
    match: /ix1/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#1D4ED8",
      secondaryColor: "#0F172A",
      accentColor: "#93C5FD",
      ledSignature: "twin_pod",
      claimedRangeLabel: "531 km MIDC",
      highlightTag: "BMW LWB eDrive20L",
    },
  },
  {
    match: /i4/i,
    profile: {
      archetype: "sedan",
      category: "4W Sedan / Coupe",
      primaryColor: "#0F766E",
      secondaryColor: "#0F172A",
      accentColor: "#5EEAD4",
      ledSignature: "twin_pod",
      claimedRangeLabel: "483–590 km WLTP",
      highlightTag: "Gran Coupe 180 kW",
    },
  },
  {
    match: /eqa/i,
    profile: {
      archetype: "midsize_suv",
      category: "4W Car / SUV",
      primaryColor: "#CBD5E1",
      secondaryColor: "#0F172A",
      accentColor: "#60A5FA",
      ledSignature: "lightbar",
      claimedRangeLabel: "560 km WLTP",
      highlightTag: "Mercedes Star EQ",
    },
  },
  {
    match: /countryman/i,
    profile: {
      archetype: "compact_suv",
      category: "4W Car / SUV",
      primaryColor: "#047857",
      secondaryColor: "#F8FAFC",
      accentColor: "#FDE047",
      ledSignature: "twin_pod",
      claimedRangeLabel: "462 km WLTP",
      highlightTag: "MINI Electric SUV",
    },
  },
  // 2-Wheelers
  {
    match: /450x/i,
    profile: {
      archetype: "scooter",
      category: "2W Scooter / Bike",
      primaryColor: "#65A30D",
      secondaryColor: "#0F172A",
      accentColor: "#BEF264",
      ledSignature: "mono_drl",
      claimedRangeLabel: "161 km IDC",
      highlightTag: "Ather Grid 2W",
    },
  },
  {
    match: /rizta/i,
    profile: {
      archetype: "scooter",
      category: "2W Scooter / Bike",
      primaryColor: "#0284C7",
      secondaryColor: "#F8FAFC",
      accentColor: "#7DD3FC",
      ledSignature: "lightbar",
      claimedRangeLabel: "160 km IDC",
      highlightTag: "Family 2W Scooter",
    },
  },
  {
    match: /s1 pro/i,
    profile: {
      archetype: "scooter",
      category: "2W Scooter / Bike",
      primaryColor: "#2563EB",
      secondaryColor: "#0F172A",
      accentColor: "#93C5FD",
      ledSignature: "twin_pod",
      claimedRangeLabel: "242 km IDC",
      highlightTag: "High-Range 2W",
    },
  },
  {
    match: /iqube/i,
    profile: {
      archetype: "scooter",
      category: "2W Scooter / Bike",
      primaryColor: "#0F172A",
      secondaryColor: "#B45309",
      accentColor: "#FBBF24",
      ledSignature: "lightbar",
      claimedRangeLabel: "150 km IDC",
      highlightTag: "5.3 kWh ST Scooter",
    },
  },
  {
    match: /chetak/i,
    profile: {
      archetype: "scooter",
      category: "2W Scooter / Bike",
      primaryColor: "#1E3A8A",
      secondaryColor: "#475569",
      accentColor: "#93C5FD",
      ledSignature: "mono_drl",
      claimedRangeLabel: "153 km IDC",
      highlightTag: "Metal-Body 2W",
    },
  },
  {
    match: /vida/i,
    profile: {
      archetype: "scooter",
      category: "2W Scooter / Bike",
      primaryColor: "#EA580C",
      secondaryColor: "#0F172A",
      accentColor: "#FDBA74",
      ledSignature: "mono_drl",
      claimedRangeLabel: "165 km IDC",
      highlightTag: "Removable Battery 2W",
    },
  },
  {
    match: /f77|ultraviolette/i,
    profile: {
      archetype: "motorcycle",
      category: "2W Scooter / Bike",
      primaryColor: "#DC2626",
      secondaryColor: "#0F172A",
      accentColor: "#F87171",
      ledSignature: "mono_drl",
      claimedRangeLabel: "323 km IDC",
      highlightTag: "10.3 kWh Superbike",
    },
  },
];

export function getVehicleVisualProfile(
  manufacturer?: string,
  model?: string
): VehicleVisualProfile {
  const haystack = `${manufacturer || ""} ${model || ""}`;
  for (const entry of MODEL_PROFILES) {
    if (entry.match.test(haystack)) {
      return entry.profile;
    }
  }
  return DEFAULT_PROFILE;
}
