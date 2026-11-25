import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusAlert } from "../components/StatusAlert";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import type { UserPreferences } from "../types/api";

export function ProfilePage() {
  const { firebaseUser, profile, refreshProfile, logout } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [mapStyle, setMapStyle] = useState<"standard" | "terrain">("standard");
  const [reserveSocPct, setReserveSocPct] = useState(15);
  const [maxDetourKm, setMaxDetourKm] = useState(12);
  const [preferFastChargers, setPreferFastChargers] = useState(true);
  const [tripReminders, setTripReminders] = useState(true);
  const [dataAlerts, setDataAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: () =>
      apiRequest<UserPreferences>("/users/me/preferences", { authRequired: true }),
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (prefs) {
      setUnits(prefs.preferredUnits);
      setMapStyle(prefs.preferredMapStyle);
      setReserveSocPct(prefs.preferredRouteSettings?.reserveSocPct ?? 15);
      setMaxDetourKm(prefs.preferredRouteSettings?.maxDetourKm ?? 12);
      setPreferFastChargers(prefs.preferredRouteSettings?.preferFastChargers ?? true);
      setTripReminders(prefs.preferredNotificationSettings?.tripReminders ?? true);
      setDataAlerts(prefs.preferredNotificationSettings?.dataAlerts ?? true);
      setEmailDigest(prefs.preferredNotificationSettings?.emailDigest ?? false);
    }
  }, [prefs]);

  const profileMut = useMutation({
    mutationFn: () =>
      apiRequest("/users/me", {
        method: "PATCH",
        authRequired: true,
        body: { display_name: displayName, phone },
      }),
    onSuccess: async () => {
      await refreshProfile();
      setSavedNotice("PostgreSQL profile updated.");
      setErrorMsg(null);
    },
    onError: (e) => setErrorMsg((e as Error).message),
  });

  const prefMut = useMutation({
    mutationFn: () =>
      apiRequest<UserPreferences>("/users/me/preferences", {
        method: "PATCH",
        authRequired: true,
        body: {
          preferredUnits: units,
          preferredMapStyle: mapStyle,
          preferredRouteSettings: {
            reserveSocPct: Number(reserveSocPct),
            preferFastChargers,
            maxDetourKm: Number(maxDetourKm),
            preferredAmenities: ["restaurant", "washroom"],
          },
          preferredNotificationSettings: {
            tripReminders,
            dataAlerts,
            emailDigest,
          },
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["user-preferences"] });
      setSavedNotice(
        res.firestoreAvailable
          ? "Firestore preferences saved."
          : "Preferences saved locally (Firestore emulator/service offline)."
      );
      setErrorMsg(null);
    },
    onError: (e) => setErrorMsg((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      apiRequest("/users/me", { method: "DELETE", authRequired: true }),
    onSuccess: async () => {
      await logout();
      navigate("/");
    },
    onError: (e) => setErrorMsg((e as Error).message),
  });

  return (
    <div className="max-w-[920px] mx-auto px-[16px] sm:px-[24px] py-[36px] space-y-[24px]">
      <div>
        <h1 className="text-[28px] font-semibold text-[#121317] m-0">
          Profile & Preferences
        </h1>
        <p className="text-[15px] text-[#45474D] mt-[4px] mb-0">
          Identity managed by Firebase Authentication; profile stored in PostgreSQL; settings stored in Cloud Firestore.
        </p>
      </div>

      {savedNotice && <StatusAlert title="Saved" message={savedNotice} />}
      {errorMsg && <StatusAlert title="Error" message={errorMsg} variant="error" />}

      {/* Identity & PostgreSQL Profile */}
      <section className="cw-card p-[24px] space-y-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">Account Identity</h2>
          <div className="flex items-center gap-[8px]">
            <span className="cw-pill">
              {firebaseUser?.emailVerified ? "Email Verified" : "Email Unverified"}
            </span>
            <span className="cw-pill cw-pill-accent">Role: {profile?.role || "user"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <div>
            <label htmlFor="prof-email" className="block text-[13px] font-medium mb-[6px]">
              Email (Firebase Auth)
            </label>
            <input
              id="prof-email"
              className="cw-input"
              value={firebaseUser?.email || ""}
              disabled
            />
          </div>
          <div>
            <label htmlFor="prof-uid" className="block text-[13px] font-medium mb-[6px]">
              Firebase UID
            </label>
            <input
              id="prof-uid"
              className="cw-input"
              value={firebaseUser?.uid || ""}
              disabled
            />
          </div>
          <div>
            <label htmlFor="prof-name" className="block text-[13px] font-medium mb-[6px]">
              Display name
            </label>
            <input
              id="prof-name"
              className="cw-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-[13px] font-medium mb-[6px]">
              Phone (optional)
            </label>
            <input
              id="prof-phone"
              className="cw-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-[10px]">
          {!firebaseUser?.emailVerified ? (
            <Link to="/verify-email" className="text-[13px] underline text-[#121317]">
              Verify email address
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={profileMut.isPending}
            onClick={() => profileMut.mutate()}
            className="cw-btn-primary"
          >
            {profileMut.isPending ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>

      {/* Firestore Preferences */}
      <section className="cw-card p-[24px] space-y-[16px]">
        <div className="flex items-center justify-between gap-[10px]">
          <h2 className="text-[18px] font-semibold text-[#121317] m-0">
            Route & Notification Preferences (Cloud Firestore)
          </h2>
          {prefs && !prefs.firestoreAvailable && (
            <span className="cw-pill">Firestore Offline</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          <div>
            <label htmlFor="pref-units" className="block text-[13px] font-medium mb-[6px]">
              Preferred units
            </label>
            <select
              id="pref-units"
              className="cw-input"
              value={units}
              onChange={(e) => setUnits(e.target.value as "metric" | "imperial")}
            >
              <option value="metric">Metric (km, kWh)</option>
              <option value="imperial">Imperial (mi, kWh)</option>
            </select>
          </div>
          <div>
            <label htmlFor="pref-map" className="block text-[13px] font-medium mb-[6px]">
              Map display mode
            </label>
            <select
              id="pref-map"
              className="cw-input"
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as "standard" | "terrain")}
            >
              <option value="standard">Standard Light</option>
              <option value="terrain">Terrain Highlight</option>
            </select>
          </div>
          <div>
            <label htmlFor="pref-reserve" className="block text-[13px] font-medium mb-[6px]">
              Default reserve SOC (%)
            </label>
            <input
              id="pref-reserve"
              type="number"
              min={5}
              max={50}
              className="cw-input"
              value={reserveSocPct}
              onChange={(e) => setReserveSocPct(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="pref-detour" className="block text-[13px] font-medium mb-[6px]">
              Default max detour (km)
            </label>
            <input
              id="pref-detour"
              type="number"
              min={1}
              max={50}
              className="cw-input"
              value={maxDetourKm}
              onChange={(e) => setMaxDetourKm(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-[16px] text-[14px]">
          <label className="flex items-center gap-[8px]">
            <input
              type="checkbox"
              checked={preferFastChargers}
              onChange={(e) => setPreferFastChargers(e.target.checked)}
            />
            <span>Prefer fast DC chargers</span>
          </label>
          <label className="flex items-center gap-[8px]">
            <input
              type="checkbox"
              checked={tripReminders}
              onChange={(e) => setTripReminders(e.target.checked)}
            />
            <span>Trip saved alerts</span>
          </label>
          <label className="flex items-center gap-[8px]">
            <input
              type="checkbox"
              checked={dataAlerts}
              onChange={(e) => setDataAlerts(e.target.checked)}
            />
            <span>Station verification updates</span>
          </label>
          <label className="flex items-center gap-[8px]">
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
            />
            <span>Email summary digest</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={prefMut.isPending}
            onClick={() => prefMut.mutate()}
            className="cw-btn-primary"
          >
            {prefMut.isPending ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </section>

      {/* Account Deletion */}
      <section className="cw-card p-[24px] space-y-[12px]">
        <h2 className="text-[18px] font-semibold text-[#121317] m-0">Delete Account</h2>
        <p className="text-[14px] text-[#45474D] m-0">
          Permanently deletes your vehicles and trips in PostgreSQL, your Firestore user documents, and your Firebase Auth user.
        </p>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="cw-btn-secondary"
          >
            Request Account Deletion
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-[10px] cw-card-muted p-[14px]">
            <span className="text-[14px] font-medium text-[#121317]">
              Are you sure? This action cannot be undone.
            </span>
            <button
              type="button"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
              className="cw-btn-primary"
            >
              {deleteMut.isPending ? "Deleting..." : "Confirm Permanent Delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="cw-btn-secondary"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
