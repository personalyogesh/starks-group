"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  User,
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import { ensureUserDoc, getUser, touchLastLogin, updateUserProfile, UserDoc } from "@/lib/firestore";

export type CurrentUser = {
  authUser: User;
  userDoc: UserDoc | null;
};

type AuthCtx = {
  currentUser: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (args: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    sportInterest?: string;
    joinAs?: string;
    agreedToTerms?: boolean;
    wantsUpdates?: boolean;
  }) => Promise<void>;
  updateProfile: (patch: Partial<UserDoc>) => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  currentUser: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  signup: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthUser(null);
      setUserDoc(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      if (u) {
        try {
          const k = `starks:lastLoginTouch:${u.uid}`;
          const prev = typeof window !== "undefined" ? window.localStorage.getItem(k) : null;
          const now = Date.now();
          const shouldTouch = !prev || now - Number(prev) > 6 * 60 * 60 * 1000; // 6h
          if (shouldTouch) {
            await touchLastLogin(u.uid);
            if (typeof window !== "undefined") window.localStorage.setItem(k, String(now));
          }
        } catch {
          // ignore
        }
        const doc = await getUser(u.uid);
        setUserDoc(doc);
        if (doc?.suspended) {
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                "starks:authError",
                "Your account is suspended. Please contact an administrator."
              );
            }
          } catch {
            // ignore
          }
          await signOut(auth);
          setAuthUser(null);
          setUserDoc(null);
        }
      }
      else setUserDoc(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase isn’t configured.");
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!isFirebaseConfigured || !auth) return;
    await signOut(auth);
  };

  const signup: AuthCtx["signup"] = async ({
    email,
    password,
    firstName,
    lastName,
    sportInterest,
    joinAs,
    agreedToTerms,
    wantsUpdates,
  }) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase isn’t configured.");
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    const fullName = `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
    if (fullName) {
      await fbUpdateProfile(cred.user, { displayName: fullName });
    }

    await ensureUserDoc(cred.user.uid, {
      name: fullName || email,
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      email,
      sportInterest,
      joinAs,
      agreedToTerms,
      wantsUpdates,
      status: "pending",
      role: "member",
    });
  };

  const updateProfile = async (patch: Partial<UserDoc>) => {
    if (!authUser) throw new Error("Not authenticated");
    if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
    await updateUserProfile(authUser.uid, patch);
    setUserDoc((prev) => ({ ...(prev ?? ({} as UserDoc)), ...patch }));
  };

  const value = useMemo<AuthCtx>(() => {
    return {
      currentUser: authUser ? { authUser, userDoc } : null,
      loading,
      login,
      logout,
      signup,
      updateProfile,
    };
  }, [authUser, userDoc, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!currentUser) router.replace("/login");
  }, [loading, currentUser, router]);

  if (loading) return <p>Loading...</p>;
  if (!currentUser) return null;
  return <>{children}</>;
}

