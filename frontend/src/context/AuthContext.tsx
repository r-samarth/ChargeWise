import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { apiRequest } from "../lib/api";
import type { UserProfile } from "../types/api";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  authError: string | null;
  clearAuthError: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    displayName: string,
    email: string,
    password: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function formatFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please verify your credentials and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Please choose at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a minute before trying again.";
    case "auth/user-disabled":
      return "This account has been disabled by an administrator.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing.";
    case "auth/network-request-failed":
      return "Network connection failed while reaching Firebase Authentication.";
    default:
      return (err as Error)?.message || "Authentication failed. Please try again.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdminClaim, setIsAdminClaim] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncBackendProfile = async (user: FirebaseUser) => {
    try {
      const tokenRes = await user.getIdTokenResult();
      setIsAdminClaim(tokenRes.claims.role === "admin" || tokenRes.claims.admin === true);
      const me = await apiRequest<UserProfile>("/users/me", { authRequired: true });
      setProfile(me);
    } catch {
      // Backend might be offline momentarily; keep Firebase user session intact
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncBackendProfile(user);
      } else {
        setProfile(null);
        setIsAdminClaim(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncBackendProfile(cred.user);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const registerWithEmail = async (
    displayName: string,
    email: string,
    password: string
  ) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Emulator or quota warning should not break signup
      }
      await syncBackendProfile(cred.user);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncBackendProfile(cred.user);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setIsAdminClaim(false);
  };

  const requestPasswordReset = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const msg = formatFirebaseError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser });
      await syncBackendProfile(auth.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin: isAdminClaim && profile?.role === "admin",
        authError,
        clearAuthError: () => setAuthError(null),
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        requestPasswordReset,
        resendVerificationEmail,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
