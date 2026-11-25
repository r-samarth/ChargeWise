# Firebase Authentication & Cloud Firestore Setup Guide — ChargeWise

**Last Verified:** 2026-11-25

---

## 1. Architecture Role of Firebase in ChargeWise

- **Firebase Authentication:** Sole authentication authority (Email/Password, Google Sign-In, Email Verification, Password Reset, Account Deletion, Admin Custom Claims).
- **Cloud Firestore:** Stores `users/{firebaseUid}`, `settings/preferences`, `notifications`, `activity`, and opt-in `tripUpdates`.
- **PostgreSQL + PostGIS:** Stores stations, connectors, operators, vehicles, trips, amenities, and audit logs (`users.firebase_uid` links both worlds).

---

## 2. Firebase Console Project Setup (Production)

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g., `chargewise-karnataka`).
2. **Authentication → Sign-in method:**
   - Enable **Email/Password** (leave passwordless email link optional).
   - Enable **Google** sign-in (configure support email).
   - Under **Authentication → Settings → Authorized domains**, add:
     - `localhost` (development)
     - Your production Vercel domain (e.g., `chargewise-karnataka.vercel.app`) and custom domain if any.
   - Under **Templates**, customize Email Verification and Password Reset templates with ChargeWise branding.
3. **Cloud Firestore:**
   - Create a Firestore database in **Native mode**.
   - Select region **`asia-south1` (Mumbai)** or **`asia-south2` (Delhi)** — `asia-south1` is closest to Karnataka for lowest latency.
4. **Web App Registration:**
   - Register a Web App in Project Settings and copy the public config into `frontend/.env` using `VITE_` prefixes:
     ```env
     VITE_FIREBASE_API_KEY=...
     VITE_FIREBASE_AUTH_DOMAIN=...
     VITE_FIREBASE_PROJECT_ID=...
     VITE_FIREBASE_STORAGE_BUCKET=...
     VITE_FIREBASE_MESSAGING_SENDER_ID=...
     VITE_FIREBASE_APP_ID=...
     VITE_USE_FIREBASE_EMULATORS=false
     ```
   - Never treat `VITE_*` config as secret, and **never** place Admin SDK credentials in `frontend/`.
5. **Backend Firebase Admin SDK Credentials:**
   - Generate a Service Account key in **Project Settings → Service Accounts** (for non-GCP hosting like Render) OR configure Application Default Credentials (ADC) in GCP.
   - **NEVER commit the service-account JSON file to Git.**
   - In Render/production, pass `FIREBASE_PROJECT_ID` and either `FIREBASE_SERVICE_ACCOUNT_JSON` (inline JSON string in secret env var) or `GOOGLE_APPLICATION_CREDENTIALS` mounted securely outside the repo.

---

## 3. Deploying Security Rules & Composite Indexes

Rules and index definitions live in the repository root:
- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`

Deploy via Firebase CLI:
```bash
firebase login
firebase use <your-firebase-project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 4. Local Development with Firebase Emulators

ChargeWise is configured to run locally against the Firebase Authentication and Firestore Emulators so developers and CI can verify auth flows and security rules without touching production data or billing.

1. Ensure Node.js + Java (JDK 17+) + `firebase-tools` are installed (`firebase --version`).
2. Start Auth & Firestore emulators from repository root:
   ```bash
   firebase emulators:start --only auth,firestore
   ```
   Default ports in `firebase.json`:
   - Auth Emulator: `127.0.0.1:9099`
   - Firestore Emulator: `127.0.0.1:8080`
   - Emulator UI: `127.0.0.1:4000`
3. Configure `backend/.env` for local emulation:
   ```env
   FIREBASE_PROJECT_ID=demo-chargewise
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   ```
4. Configure `frontend/.env.local` for local emulation:
   ```env
   VITE_FIREBASE_API_KEY=demo-api-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-chargewise.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=demo-chargewise
   VITE_USE_FIREBASE_EMULATORS=true
   ```
5. Run Firestore security-rule emulator tests:
   ```bash
   firebase emulators:exec --only firestore "npm --prefix tests/firestore run test"
   ```

---

## 5. Admin Role & Custom Claims

1. Never grant admin access from a frontend flag or editable Firestore field.
2. Assign admin privilege out-of-band using Firebase Admin SDK (`auth.set_custom_user_claims(uid, {"role": "admin"})`) via `backend/scripts/set_admin_claim.py` and synchronize `users.role = 'admin'` in PostgreSQL.
3. On every protected admin endpoint, FastAPI verifies BOTH:
   - Decoded Firebase ID token validity & non-revocation (`check_revoked=True` when configured) and `role == "admin"` claim (or explicit admin allowlist in controlled local dev), AND
   - Active PostgreSQL user record with `role == "admin"` and `account_status == "active"`.

---

## 6. Account Lifecycle & Partial Failure Handling

1. **Registration / First Sign-In:**
   - Client signs up via Firebase Web SDK (`createUserWithEmailAndPassword` + `sendEmailVerification`) or Google OAuth.
   - Client calls `GET /api/v1/users/me` with `Bearer <ID_TOKEN>`.
   - FastAPI executes idempotent upsert in PostgreSQL (`ON CONFLICT (firebase_uid) DO UPDATE` / safe lookup) and enqueues `sync_outbox` event `user_init:<uid>` to initialize `users/{uid}` and `users/{uid}/settings/preferences` in Firestore via Admin SDK (`set(..., merge=True)`).
   - If Firestore initialization fails transiently, `users` remains valid in PostgreSQL and the outbox retries on the next call or background sweep.
2. **Profile Update (`PATCH /api/v1/users/me`):**
   - Updates PostgreSQL first, then enqueues idempotent Firestore profile update.
3. **Account Deletion (`DELETE /api/v1/users/me`):**
   - Deletes/cascades user-owned vehicles, trips, and trip stops in PostgreSQL (or marks user `deleted` if audit retention requires, scrubbing PII).
   - Deletes `users/{uid}` and its subcollections (`notifications`, `activity`, `settings`, `tripUpdates`) in Firestore via Admin SDK batched deletes.
   - Calls `firebase_admin.auth.delete_user(uid)` last so client retry remains authorized if an earlier step failed transiently.

---

## 7. Pricing & Quota Guardrails

Current Firebase Spark & Blaze free daily/monthly allowances (verified 2026-11-25; verify in Firebase Console before launch):
- **Firebase Authentication:** 50,000 MAUs free (Email/Google); SMS OTP requires Blaze (avoided in MVP).
- **Cloud Firestore:** 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day, 1 GiB storage, 10 GiB/month egress.
- **ChargeWise Safeguards:** No `onSnapshot` over station collections, 20-item notification pagination, single preference doc per user, and backend HTTP caching.
