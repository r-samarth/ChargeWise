# Data Sources, Licensing, and Provenance — ChargeWise

**Retrieval & Audit Date:** 2026-11-25  
**Scope:** Karnataka EV Charging Infrastructure, Amenities, Routing, Elevation, and DAV Datasets

---

## 1. Data Integrity & Verification Policy

ChargeWise enforces strict separation between verified disclosures and inferred/estimated values:
- Every charging station record preserves `source`, `source_id`, `verification_status` (6 explicit states), `confidence_score`, and `station_source_records`.
- **Never fabricated:** Station names, coordinates, connector types, rated kW power, prices, opening hours, amenity ratings, or live connector availability.
- **Unknown ≠ Available:** Because no Indian CPO provides an open unauthenticated live OCPP/OCPI availability feed, connector `availability_status` defaults to `unknown` unless confirmed by an authorized live feed or manual verification timestamp.

---

## 2. Evaluated & Integrated Data Sources

| Source | Origin & Retrieval Date | License / Terms | Geo Coverage | Fields Provided | Reliability & Limitations |
|---|---|---|---|---|---|
| **OpenStreetMap (OSM) via Overpass API** | OpenStreetMap contributors (`overpass-api.de`), retrieved `2026-11-25` | **ODbL 1.0** (attribution required; ShareAlike for derived DB) | Global / Karnataka bounding box (`92` raw `amenity=charging_station` elements fetched into `data/raw/osm_karnataka_chargers.json`) | `osm_id`, `lat`, `lon`, `name`, `operator`/`network`/`brand`, `socket:*`, `capacity`, `opening_hours` | **High coordinate accuracy**, but sparse outside Bengaluru: only `2` mapped elements inside the Mysuru–Mangaluru–Hassan corridor bounding box; `addr:city` missing on 92/92 raw elements; bounding box also clips neighboring states (must filter strictly to Karnataka). |
| **OpenStreetMap Nominatim** | `nominatim.openstreetmap.org`, retrieved `2026-11-25` | **ODbL 1.0** (max 1 req/sec fair use with `User-Agent`) | Karnataka towns, highway corridors, landmarks | Canonical place coordinates, administrative district/state verification | Reliable geocoding for Karnataka towns and major landmarks; not a charger registry. |
| **Official Operator Public Disclosures (Tata Power, Zeon, Statiq, ChargeZone, Jio-bp, BESCOM, Glida, BPCL, HPCL, Kazam, Relux, Ather, EESL)** | Operator official web locators & Play/App Store listings, verified `2026-11-25` | Publicly listed informational metadata; **proprietary app/API scraping prohibited** | Karnataka highways (NH 275, NH 75, NH 48, NH 66) & major cities | Verified station names, addresses, rated DC/AC kW, CCS2/Type-2 connectors, official web/app URLs, support phone/email | **High operational fidelity** for flagship highway nodes (e.g., Sri Krishna Cafe Bannikuppe, Zeon Urs Kar Kushalnagar, Zeon Mahaveer Ventures Puttur, Mall of Mysore, City Centre Mall Mangaluru); lacks public unauthenticated live-availability APIs. |
| **Open Charge Map (OCM)** | `api.openchargemap.org/v3/`, evaluated `2026-11-25` | **CC BY-SA 4.0** (crowdsourced) / mixed source licenses; free API key required | India (`countrycode=IN`) | Coordinates, `Connections`, `UsageType`, `OperatorInfo`, `DateLastStatusUpdate` | Good supplementary registry when an `OCM_API_KEY` is configured in `.env`; requires deduplication against OSM and official disclosures because community entries can be stale. |
| **Ministry of Heavy Industries / BEE Public Charging Datasets (via OGD India / `data.gov.in`)** | Government of India / BEE state-wise counts, retrieved `2026-11-25` | **NDSAP (Open Government Data India)** — attribution required | Pan-India & Karnataka (`1,041` stations in 2023–24 snapshot; `6,000+` reported in 2025–26 state disclosures) | State/city/station aggregates, connector counts | Authoritative macro statistics; historical snapshots lag current fast-charger deployments; state-level aggregates lack connector-level live state. |
| **VAHAN / Karnataka EV Sales & Registrations Dataset** | MoRTH VAHAN disclosures & Codebasics/AtliQ public EV dataset (`KunalGarodi/Detailed-Analysis-of-Indian-EV-Market`), retrieved `2026-11-25` | Public educational/OGD analytical dataset (attributed to VAHAN / BEE) | All Indian states including Karnataka monthly 2W/4W sales & maker totals | `date`, `state`, `vehicle_category`, `electric_vehicles_sold`, `total_vehicles_sold`, `maker` | Genuine historical time-series for Karnataka EV penetration EDA & forecasting; aggregated monthly (no individual trip telemetry). |
| **NITI Aayog e-Amrit Locator (`mglsj/indian_ev_charging_stations`)** | Evaluated `2026-11-25` | **Restricted:** `e-amrit.niti.gov.in/website-policies` states **prior email permission required before use** | India | Evaluated only (NOT ingested) | **Excluded from ingestion** to respect copyright/website policy. Documented here for license transparency. |
| **OSRM Public Demo Routing Engine** | `router.project-osrm.org`, tested `2026-11-25` | OSM routing data (ODbL); public demo server has fair-use limits (best-effort SLA) | Karnataka road network | Road distance (`254.6 km` Mysuru → Mangaluru), duration, GeoJSON polyline | Real road geometry; paired with a deterministic **Karnataka Highway Corridor Fallback** if OSRM times out or in offline tests. |
| **Open-Meteo Elevation API** | `api.open-meteo.com/v1/elevation`, tested `2026-11-25` | CC BY 4.0 (non-commercial / fair use) | Global DEM (~90m Copernicus/SRTM) | Elevation in meters (Mysuru `748 m`, Madikeri `1,136 m`, Mangaluru `27 m`) | Essential for realistic Western Ghats climb/descent energy modeling; falls back gracefully to flat-route assumption if unreachable. |
| **External EV Charging Session Dataset (for DAV ML Experimentation only)** | Caltech ACN / Open EV Session Dataset (evaluated for Phase 5 notebooks) | Open academic license (CC BY 4.0) | Pasadena, California, USA (non-Karnataka!) | Session kWh, arrival/departure timestamps, duration | **Strict Geographic Disclosure:** Represents US workplace charging behavior, NOT Karnataka highway DC fast charging. Used strictly to demonstrate regression/clustering methodology without temporal leakage. |

---

## 3. Map & Routing Provider Comparison

| Criterion | Leaflet + OSM/CARTO Tiles + OSRM | MapLibre GL JS + PMTiles/MapTiler + GraphHopper | Google Maps Platform |
|---|---|---|---|
| **License** | BSD-2-Clause + ODbL | BSD-3-Clause + commercial/self-hosted tiles | Proprietary commercial |
| **API Key / Billing Risk** | **None** for Leaflet/OSRM demo (self-hostable OSRM in Docker for prod) | Tile provider key needed (or self-hosted PMTiles) | Credit card + $200/mo tier then per-1k request billing |
| **Bundle & Rendering Reliability** | ~42 KB gzipped; DOM/Canvas works across all browsers including headless CI | Larger WebGL bundle; can fail without GPU/WebGL context | Heavy external script; strict TOS forbids caching route/station data in own DB |
| **Google Maps TOS Conflict** | None | None | **Prohibits storing/combining Places/Directions coordinates alongside non-Google datasets in PostgreSQL** |
| **Decision for ChargeWise** | **Selected.** Zero TOS conflict with PostgreSQL/PostGIS storage, zero key friction, clean clustering, and native OSRM road routing. | Strong future upgrade for 3D vector tiles | Rejected due to cost and data-persistence TOS restrictions |
