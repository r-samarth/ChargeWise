import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-chargewise.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-chargewise",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-chargewise.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:chargewise",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

const useEmulators =
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

if (useEmulators && typeof window !== "undefined") {
  const globalFlag = window as unknown as { __cwEmulatorsConnected?: boolean };
  if (!globalFlag.__cwEmulatorsConnected) {
    const authUrl =
      import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099";
    const fsHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "127.0.0.1";
    const fsPort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8085);
    connectAuthEmulator(auth, authUrl, { disableWarnings: true });
    connectFirestoreEmulator(db, fsHost, fsPort);
    globalFlag.__cwEmulatorsConnected = true;
  }
}
