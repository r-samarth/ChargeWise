import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { after, before, beforeEach } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-chargewise";
let testEnv;

before(async () => {
  const rules = fs.readFileSync(
    path.resolve(process.cwd(), "../../firestore.rules"),
    "utf8"
  );
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8085,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice/notifications/n1"), {
      title: "Trip saved",
      message: "Mysuru to Mangaluru planned",
      type: "trip_saved",
      read: false,
      createdAt: serverTimestamp(),
      relatedEntityId: "trip-1",
      deepLink: "/trips/trip-1",
    });
    await setDoc(doc(db, "users/bob/settings/preferences"), {
      preferredUnits: "metric",
      preferredMapStyle: "standard",
      updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "users/bob/notifications/nb1"), {
      title: "Bob notice",
      message: "Private",
      type: "system",
      read: false,
      createdAt: serverTimestamp(),
    });
    await setDoc(doc(db, "admin/config"), { maintenance: false });
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

test("unauthenticated access is denied by default", async () => {
  const anonDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonDb, "users/alice/notifications/n1")));
  await assertFails(getDoc(doc(anonDb, "admin/config")));
});

test("user can read and write own preferences with valid fields", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(
    setDoc(doc(aliceDb, "users/alice/settings/preferences"), {
      preferredUnits: "metric",
      preferredMapStyle: "terrain",
      preferredRouteSettings: {
        reserveSocPct: 15,
        preferFastChargers: true,
        maxDetourKm: 12,
        preferredAmenities: ["restaurant", "washroom"],
      },
      updatedAt: serverTimestamp(),
    })
  );
  await assertSucceeds(getDoc(doc(aliceDb, "users/alice/settings/preferences")));
});

test("user cannot access another user's preferences or notifications", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertFails(getDoc(doc(aliceDb, "users/bob/settings/preferences")));
  await assertFails(getDoc(doc(aliceDb, "users/bob/notifications/nb1")));
  await assertFails(
    setDoc(doc(aliceDb, "users/bob/settings/preferences"), {
      preferredUnits: "imperial",
    })
  );
});

test("invalid document fields and privilege escalation are rejected", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  // Invalid units enum rejected
  await assertFails(
    setDoc(doc(aliceDb, "users/alice/settings/preferences"), {
      preferredUnits: "kelvin",
    })
  );
  // Role injection in user profile rejected
  await assertFails(
    setDoc(doc(aliceDb, "users/alice"), {
      firebaseUid: "alice",
      displayName: "Alice",
      email: "alice@example.com",
      role: "admin",
    })
  );
  // Spoofed firebaseUid in payload rejected
  await assertFails(
    setDoc(doc(aliceDb, "users/alice"), {
      firebaseUid: "bob",
      displayName: "Alice",
      email: "alice@example.com",
    })
  );
});

test("notifications allow only toggling 'read' and block arbitrary creation or edits", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertSucceeds(
    updateDoc(doc(aliceDb, "users/alice/notifications/n1"), { read: true })
  );
  // Cannot modify title/message
  await assertFails(
    updateDoc(doc(aliceDb, "users/alice/notifications/n1"), {
      title: "Hacked",
    })
  );
  // Cannot create arbitrary notification client-side
  await assertFails(
    setDoc(doc(aliceDb, "users/alice/notifications/n2"), {
      title: "Fake",
      message: "Injected",
      type: "system",
      read: false,
    })
  );
});

test("activity feed, tripUpdates, and admin docs reject client writes", async () => {
  const aliceDb = testEnv.authenticatedContext("alice").firestore();
  await assertFails(
    setDoc(doc(aliceDb, "users/alice/activity/a1"), {
      type: "fake",
      title: "Fake",
    })
  );
  await assertFails(
    setDoc(doc(aliceDb, "users/alice/tripUpdates/t1"), {
      tripStatus: "in_progress",
    })
  );
  await assertFails(getDoc(doc(aliceDb, "admin/config")));
  await assertFails(
    setDoc(doc(aliceDb, "admin/config"), { maintenance: true })
  );
});
