# ChargeWise — Karnataka EV Charging Intelligence & Smart Trip Planner

ChargeWise is a production-minded EV charging discovery, verification, and deterministic trip-planning platform built specifically for **Karnataka, India** (featuring the **Mysuru → Mangaluru** corridor across NH-275 & NH-75).

> **Core Engineering Principle — Trust:** ChargeWise never fabricates live availability, pricing, ratings, or connector ratings. Unknown values are surfaced honestly (`Unknown` occupancy, `Information unavailable` for unverified amenity hours/ratings, and a 6-state verification model).

---

## Architecture Overview

1. **Identity:** **Firebase Authentication** (Email/Password, Google Sign-In, Email Verification, Password Reset, Custom Claims RBAC). No passwords are stored in PostgreSQL or Firestore.
2. **Authoritative Spatial & Relational Store:** **PostgreSQL 16 + PostGIS 3.4** (`charging_stations`, `charging_connectors`, `operators`, `station_source_records`, `vehicles`, `ev_vehicle_catalog`, `amenities`, `trips`, `trip_stops`, `sync_outbox`, `audit_logs`).
3. **User-Facing Preferences & Inbox:** **Cloud Firestore** (`users/{uid}`, `settings/preferences`, `notifications`, `activity`, `tripUpdates`) synchronized idempotently via a PostgreSQL transactional outbox (`sync_outbox`) and locked down via `firestore.rules`.
4. **Backend:** **FastAPI (Python 3.13)**, SQLAlchemy 2, GeoAlchemy2, Alembic, Pydantic v2, Firebase Admin SDK, OSRM routing + Open-Meteo Ghat elevation integration + deterministic corridor fallback.
5. **Frontend:** **React 19 + Vite + TypeScript**, Tailwind CSS + Google Antigravity Design System tokens (`docs/design-system.md`), TanStack Query, Zustand, React Hook Form + Zod, Leaflet maps, and Recharts.
6. **DAV Academic Analytics:** Six reproducible, executed Jupyter notebooks (`notebooks/01`–`06`) analyzing real Karnataka OSM/verified stations and VAHAN EV registration data.

---

## Repository Structure

```text
ChargeWise/
├── backend/              # FastAPI API, Alembic migrations, deterministic trip engine, pytest suite
├── frontend/             # React + Vite + TypeScript app, Leaflet maps, Vitest suite
├── notebooks/            # 6 executed DAV notebooks (EDA, Viz, Stats, Chronological ML, K-Means)
├── data/                 # Raw OSM/VAHAN datasets & cleaned analytical exports
├── docs/                 # Market research, data sources, architecture, DB design, Firebase, deployment
├── tests/firestore/      # @firebase/rules-unit-testing emulator test suite
├── firestore.rules       # Production Firestore security rules
├── firestore.indexes.json
├── firebase.json         # Auth (9099) & Firestore (8085) emulator configuration
└── docker-compose.yml    # Local PostgreSQL 16 + PostGIS 3.4
```

---

## Quick Local Setup

### 1. Start PostgreSQL + PostGIS
```bash
docker compose up -d
```

### 2. Backend Setup, Migrations & Seed
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

### 3. Firebase Emulators (Recommended for Local Auth & Firestore)
```bash
firebase emulators:start --only auth,firestore
```

### 4. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Open `http://127.0.0.1:5173`.

---

## Running All Tests

```bash
# Backend unit & integration tests (PostgreSQL + PostGIS)
cd backend && .venv/bin/pytest -v

# Frontend unit & component tests + production build check
cd frontend && npm test && npm run build

# Firestore Security Rules emulator tests
firebase emulators:exec --only firestore "npm --prefix tests/firestore test"
```

---

## Documentation Index

- [Market Research (Karnataka & 13+ Operators)](docs/market-research.md)
- [Data Sources, Licensing & Provenance](docs/data-sources.md)
- [System Architecture](docs/architecture.md)
- [Database Design & Ownership Matrix](docs/database-design.md)
- [Firebase Authentication & Firestore Setup](docs/firebase-setup.md)
- [Design System Specification](docs/design-system.md)
- [Production Deployment Guide](docs/deployment.md)
