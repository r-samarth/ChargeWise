# System Architecture — ChargeWise

**Version:** 1.0 (Phase 1 Specification)  
**Target Geography:** Karnataka, India (extensible to additional states via `state_code` / administrative partitioning)

---

## 1. Architectural Principles

1. **Trust & Provenance First:** Never fabricate live availability, pricing, ratings, or station specs. Every station carries a `verification_status`, `confidence_score`, and linked `station_source_records`.
2. **Strict Multi-Database Ownership:** No uncontrolled two-way sync between PostgreSQL and Firestore.
3. **Explainable Deterministic Trip Planning:** Core SOC, energy, elevation-adjusted consumption, connector compatibility, and shortest-path charging-stop selection use deterministic graph optimization (Dijkstra/DP over reachable station states), never black-box ML.
4. **Safe Degradation:** If external routing (OSRM) or Firestore is temporarily unavailable, the backend degrades safely with explicit flags (`routing_source`, `is_estimated`) and transactional outbox retries.

---

## 2. Technology Stack & Trade-off Decisions

| Layer | Selected Technology | Rationale & Trade-offs |
|---|---|---|
| **Frontend Framework** | **React 18 + Vite + TypeScript** | Decoupled cleanly from the Python FastAPI backend; fast builds, clean SPA routing, first-class Firebase Web SDK (`VITE_*` env vars), zero Node SSR maintenance overhead. |
| **Styling & UI** | **Tailwind CSS + Design Tokens (`SKILL (1).md`)** | Strictly follows the Google Antigravity design system tokens (`#F8F9FC`, `#FFFFFF`, `#E6EAF0`, `#B7BFD9`, `#6A6A71`, `#45474D`, `#121317`; Google Sans Flex; 4px grid; radii `16px`/`36px`/`999px`). |
| **Client State & Server Cache** | **TanStack Query + Zustand + RHF + Zod** | TanStack Query handles API caching, stale times, and retries; Zustand holds lightweight UI/trip-draft state; React Hook Form + Zod validate forms deterministically. |
| **Maps & Routing** | **Leaflet (`react-leaflet`) + OSM/CARTO Tiles + OSRM** | BSD-2-Clause license, zero API-key billing risk, crisp 2D performance with marker clustering (`leaflet.markercluster`), works reliably without WebGL driver failure; OSRM provides road geometry & duration with deterministic Karnataka highway corridor fallback. |
| **Charts** | **Recharts** | Composable React SVG charts for SOC battery progression, Ghat elevation profile, and Karnataka analytics. |
| **Backend API** | **FastAPI (Python 3.13) + Pydantic v2** | Strict schema validation, clean dependency injection, OpenAPI generation, async HTTP clients (`httpx`) for OSRM/elevation/Overpass. |
| **Primary Database** | **PostgreSQL 16 + PostGIS 3.4 (SQLAlchemy 2 + GeoAlchemy2 + Alembic)** | Authoritative relational + geospatial store (`GEOGRAPHY(Point, 4326)`, GIST spatial indexes, `ST_DWithin` / `ST_Distance`). |
| **Identity** | **Firebase Authentication (Web SDK + Python Admin SDK)** | Zero custom password storage; email/password, Google sign-in, email verification, password reset, custom claims (`role=admin`). |
| **User-Facing Realtime/Prefs Store** | **Cloud Firestore** | Stores user preferences, notification inbox, activity feed, and opt-in trip updates per `users/{firebaseUid}` with strict security rules and pagination. |

---

## 3. High-Level System Diagram

```mermaid
flowchart LR
    U["User Browser (React + Vite + TS)"] -->|Auth & Token| FA["Firebase Auth"]
    U -->|Bearer ID Token + REST| API["FastAPI Backend"]
    U -->|Direct Scoped Reads/Pref Writes| FS["Cloud Firestore"]
    API -->|Verify ID Token / Custom Claims| FA
    API -->|Authoritative R/W + Spatial Queries| PG[("PostgreSQL 16 + PostGIS")]
    API -->|Outbox Dispatcher (Idempotent Admin SDK)| FS
    API -->|Driving Geometry & Duration| OSRM["OSRM Routing + Open-Meteo Elevation"]
    API -.->|Fallback if OSRM Down| GRAPH["Deterministic Corridor Fallback"]
```

---

## 4. Backend Modular Structure (`backend/app/`)

```text
backend/
├── app/
│   ├── main.py                  # FastAPI lifespan, CORS, rate limiting, exception handlers, health
│   ├── core/
│   │   ├── config.py            # Pydantic BaseSettings (.env)
│   │   ├── firebase.py          # Firebase Admin initialization + token verification + Firestore client
│   │   ├── security.py          # Security headers, input helpers, custom-claim checks
│   │   └── dependencies.py      # get_db, get_current_user, require_admin, rate limiter
│   ├── database/
│   │   ├── session.py           # Engine, SessionLocal, health ping
│   │   └── base.py              # Declarative Base
│   ├── models/                  # SQLAlchemy 2.0 + GeoAlchemy2 ORM entities
│   ├── schemas/                 # Pydantic v2 request/response DTOs
│   ├── repositories/            # Pure SQL/PostGIS persistence queries (no HTTP logic)
│   ├── services/                # Business orchestration, outbox dispatch, deduplication
│   ├── algorithms/
│   │   ├── energy.py            # Consumption, elevation adjustment, charging curve / taper model
│   │   ├── compatibility.py     # Connector & AC/DC power matching
│   │   └── planner.py           # Graph-based reachable charging-stop optimizer
│   ├── integrations/
│   │   ├── osrm.py              # Road routing client + corridor fallback
│   │   ├── elevation.py         # Open-Meteo elevation sampling + Ghat gradient model
│   │   └── ingestion.py         # OSM Overpass / CSV normalizer & deduplication importer
│   ├── api/v1/                  # Thin versioned FastAPI routers
│   └── utils/                   # Geo math (Haversine), hashing, logging sanitizer
├── migrations/                  # Alembic migrations
├── tests/                       # Pytest unit, integration, security, and edge-case tests
├── Dockerfile
└── requirements.txt
```

---

## 5. REST API Contract (`/api/v1`)

All protected endpoints require `Authorization: Bearer <FIREBASE_ID_TOKEN>`.

- **Health & Meta**
  - `GET /health` — PostgreSQL, PostGIS, and Firebase/Firestore readiness status.
- **Users**
  - `GET /api/v1/users/me` — Upserts/fetches PostgreSQL profile from verified Firebase token; ensures initial Firestore profile & preferences idempotently.
  - `PATCH /api/v1/users/me` — Updates `display_name` / `phone` in PostgreSQL and syncs `displayName` to Firestore via outbox.
  - `DELETE /api/v1/users/me` — Deletes/tombstones user-owned PostgreSQL records, removes Firestore subcollections, and deletes Firebase Auth user (with safe partial-failure logging).
  - `GET /api/v1/users/me/preferences` & `PATCH /api/v1/users/me/preferences` — Reads/writes `users/{firebaseUid}/settings/preferences` in Firestore.
- **Vehicles**
  - `GET /api/v1/vehicles/catalog` — Verified Indian EV reference specs (with estimate flags clearly marked).
  - `GET /api/v1/vehicles`, `POST /api/v1/vehicles`, `GET/PATCH/DELETE /api/v1/vehicles/{vehicle_id}` — Ownership-verified CRUD in PostgreSQL.
- **Charging Stations & Operators**
  - `GET /api/v1/stations` — Filter by city, district, operator, connector type, min power kW, verification status, paginated.
  - `GET /api/v1/stations/nearby` — PostGIS `ST_DWithin` radius search (`lat`, `lon`, `radius_km`).
  - `GET /api/v1/stations/{station_id}` — Station detail with connectors, operator, nearby verified amenities, and source provenance summary.
  - `GET /api/v1/operators`, `GET /api/v1/operators/{operator_id}`
  - `GET /api/v1/amenities/nearby` — PostGIS radius query around coordinates.
- **Smart Trip Planner**
  - `POST /api/v1/trips/plan` — Runs deterministic route + energy + graph charging-stop optimizer; optionally persists trip if `save=true` (emitting idempotent outbox notification & activity item).
  - `GET /api/v1/trips`, `GET /api/v1/trips/{trip_id}`, `PATCH /api/v1/trips/{trip_id}`, `DELETE /api/v1/trips/{trip_id}` — Saved journeys & trip history (ownership enforced).
- **Notifications & Activity**
  - `GET /api/v1/notifications`, `PATCH /api/v1/notifications/{notification_id}`, `PATCH /api/v1/notifications/read-all`
  - `GET /api/v1/activity`
- **Analytics**
  - `GET /api/v1/analytics/overview` — Live PostgreSQL aggregations (stations by district, operator, connector power, verification status) + documented static Karnataka VAHAN summary.
- **Admin (`require_admin` via Firebase custom claim + PostgreSQL role)**
  - `POST/PATCH /api/v1/admin/operators`, `POST/PATCH /api/v1/admin/stations`, `POST/PATCH /api/v1/admin/connectors`
  - `POST /api/v1/admin/stations/{station_id}/verify` — Updates verification status + writes `station_verification_logs` + `audit_logs`.
  - `POST /api/v1/admin/amenities`
  - `POST /api/v1/admin/import-csv` — Validates & ingests CSV rows with deduplication scoring.
  - `GET /api/v1/admin/duplicates`, `POST /api/v1/admin/duplicates/{source_record_id}/resolve`
  - `GET /api/v1/admin/data-quality`, `GET /api/v1/admin/audit-logs`

---

## 6. Cross-Database Synchronization & Outbox Pattern

Because PostgreSQL and Firestore cannot participate in a two-phase distributed commit:
1. PostgreSQL writes (e.g., creating a user, saving a trip, admin verifying a station) commit first in a local SQLAlchemy transaction alongside a row in `sync_outbox` containing a deterministic `idempotency_key` (e.g., `trip_saved:<trip_id>`).
2. Immediately after commit, the backend `OutboxDispatcher` attempts the Firestore write via Firebase Admin SDK using the deterministic document ID so retries never duplicate notifications or activity entries.
3. If Firestore is unreachable or fails, PostgreSQL changes remain durable, the `sync_outbox` row records `status='failed'` + `attempts` + `last_error`, and the API responds cleanly without lying about notification delivery (or triggers retry on subsequent requests / background sweep).

---

## 7. MVP Scope & Extensibility Beyond Karnataka

- **Phase 1–4 MVP:** Karnataka-wide station catalog anchored by deep, verified Mysuru → Mangaluru (NH 275 & NH 75) coverage, full Firebase Auth + Firestore user experience, deterministic multi-stop planner, family amenities, operator handoff links, and admin curation tools.
- **Multi-State Readiness:** `charging_stations.state` and `state_code` + PostGIS global SRID 4326 spatial indexing require zero schema rewrite to onboard Kerala, Tamil Nadu, or Maharashtra later.
