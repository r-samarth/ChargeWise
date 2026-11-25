# Deployment & Production Operations Guide — ChargeWise

## 1. Recommended Production Topology

| Component | Hosting Provider | Persistent Data / Responsibility |
|---|---|---|
| **Frontend (React + Vite)** | **Vercel** | Static SPA edge distribution + SPA fallback rewrite (`frontend/vercel.json`) |
| **Backend API (FastAPI)** | **Render** (Web Service via `backend/Dockerfile`) | Stateless Python 3.13 REST API + trip engine + Firebase Admin SDK |
| **Primary Relational/Spatial DB** | **Managed PostgreSQL + PostGIS** (Neon, Supabase, AWS RDS, or Render Postgres with PostGIS enabled) | Stations, connectors, operators, vehicles, trips, amenities, outbox, audit logs |
| **Identity & User-Facing Store** | **Firebase Authentication + Cloud Firestore (`asia-south1`)** | Auth sessions, custom claims, user preferences, notifications, activity feed |

*Never use ephemeral container storage for PostgreSQL data.*

---

## 2. Firebase Production Checklist

1. Create a production Firebase project (e.g., `chargewise-karnataka`) in **Firebase Console**.
2. Enable **Email/Password** and **Google** providers under **Authentication → Sign-in method**.
3. Add your Vercel domain to **Authentication → Settings → Authorized domains**.
4. Create **Cloud Firestore** in Native mode in **`asia-south1` (Mumbai)**.
5. Deploy rules & indexes from the repo root:
   ```bash
   firebase login
   firebase use <prod-project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
6. Generate a Service Account key for the backend, store it ONLY in Render's secret environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` (never commit to Git), and set `FIREBASE_CHECK_REVOKED=true`.
7. Promote initial admin UID:
   ```bash
   python scripts/set_admin_claim.py --uid <firebase_uid>
   ```

---

## 3. PostgreSQL + PostGIS Deployment

1. Provision PostgreSQL 16 with PostGIS enabled.
2. Set `DATABASE_URL` in Render (`postgresql+psycopg://user:pass@host:5432/dbname?sslmode=require`).
3. Run migrations and initial seed:
   ```bash
   alembic upgrade head
   python scripts/seed.py
   ```
4. Configure automated daily logical backups (`pg_dump` or managed provider snapshots).

---

## 4. Environment Variables

### Backend (Render)
- `APP_ENV=production`
- `PORT=8001`
- `CORS_ORIGINS=https://your-vercel-domain.vercel.app`
- `DATABASE_URL=postgresql+psycopg://...`
- `FIREBASE_PROJECT_ID=your-project-id`
- `FIREBASE_SERVICE_ACCOUNT_JSON={...}`
- `FIREBASE_CHECK_REVOKED=true`
- *(Do NOT set `FIREBASE_AUTH_EMULATOR_HOST` or `FIRESTORE_EMULATOR_HOST` in production!)*

### Frontend (Vercel)
- `VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1`
- `VITE_FIREBASE_API_KEY=...`
- `VITE_FIREBASE_AUTH_DOMAIN=...`
- `VITE_FIREBASE_PROJECT_ID=...`
- `VITE_FIREBASE_STORAGE_BUCKET=...`
- `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
- `VITE_FIREBASE_APP_ID=...`
- `VITE_USE_FIREBASE_EMULATORS=false`

---

## 5. Verification & Cost Considerations

- **Health probe:** Configure Render health check path to `/health` (verifies PostgreSQL + PostGIS + Firestore client readiness).
- **Firebase Free Quotas (Spark/Blaze):** 50,000 MAUs free (Email/Google); 50,000 Firestore reads/day & 20,000 writes/day free. Set Google Cloud billing budget alerts on Blaze.
- **OSRM Public Demo Limit:** Public `router.project-osrm.org` is best-effort. For high traffic, self-host an `osrm-backend` Karnataka extract container alongside Render/VPS.
