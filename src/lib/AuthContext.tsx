"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { auth, isFirebaseConfigured, storage, getFirebaseStorageBucketTroubleshootingMessage } from "@/lib/firebaseClient";
import { ensureUserDoc, getUser, touchLastLogin, updateUserProfile, UserDoc } from "@/lib/firestore";

export type CurrentUser = {
  authUser: User;
  userDoc: UserDoc | null;
};

type AuthCtx = {
  currentUser: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signup: (args: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    sportInterest?: string;
    joinAs?: string;
    countryCode?: string;
    phoneNumber?: string;
    bio?: string;
    avatarFile?: File | null;
    agreedToTerms?: boolean;
    wantsUpdates?: boolean;
  }) => Promise<void>;
  updateProfile: (patch: Partial<UserDoc>) => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  currentUser: null,
  loading: true,
  login: async () => {},
  loginWithGoogle: async () => {},
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

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase isn’t configured.");
    }

    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Ensure a Firestore user doc exists (our app requires admin approval).
    // IMPORTANT: don't overwrite an existing approved user back to "pending".
    const email = (cred.user.email ?? "").trim().toLowerCase();
    const displayName = (cred.user.displayName ?? "").trim();

    const existing = await getUser(cred.user.uid);
    if (existing) {
      const { requestedAt: _requestedAt, ...rest } = existing as any;
      await ensureUserDoc(cred.user.uid, {
        ...rest,
        name: rest.name || displayName || email || "Member",
        email: rest.email || email || "",
        ...(rest.avatarUrl ? {} : cred.user.photoURL ? { avatarUrl: cred.user.photoURL } : {}),
        stats: rest.stats ?? { posts: 0, connections: 0, events: 0, likes: 0 },
        status: rest.status ?? "pending",
        role: rest.role ?? "member",
      });
    } else {
      await ensureUserDoc(cred.user.uid, {
        name: displayName || email || "New Member",
        email,
        ...(cred.user.photoURL ? { avatarUrl: cred.user.photoURL } : {}),
        status: "pending",
        role: "member",
        stats: { posts: 0, connections: 0, events: 0, likes: 0 },
      });
    }

    // Enforce security-sensitive gating rules:
    // - suspended/rejected users should not stay signed in
    // - pending users can stay signed in, but the UI will be read-only (canInteract=false)
    const doc = await getUser(cred.user.uid);
    if (doc?.suspended) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("starks:authError", "Your account is suspended. Please contact an administrator.");
        }
      } catch {
        // ignore
      }
      await signOut(auth);
      throw new Error("Account suspended");
    }
    if (doc?.status === "rejected") {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("starks:authError", "Your account has been deactivated. Contact admin.");
        }
      } catch {
        // ignore
      }
      await signOut(auth);
      throw new Error("Account deactivated");
    }
    // pending: allowed to remain signed in (read-only until approved)
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
    countryCode,
    phoneNumber,
    bio,
    avatarFile,
    agreedToTerms,
    wantsUpdates,
  }) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase isn’t configured.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);

    const fullName = `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
    if (fullName) {
      await fbUpdateProfile(cred.user, { displayName: fullName });
    }

    // Optional avatar upload (after Auth user is created so we have uid)
    let avatarUrl: string | undefined;
    if (avatarFile) {
      const hint = getFirebaseStorageBucketTroubleshootingMessage();
      if (hint) throw new Error(hint);
      const storageRef = ref(storage, `profiles/${cred.user.uid}/avatar.jpg`);
      await uploadBytes(storageRef, avatarFile, { contentType: avatarFile.type || "image/jpeg" });
      avatarUrl = await getDownloadURL(storageRef);
    }

    const cc = countryCode?.trim() || undefined;
    const pn = phoneNumber?.replace(/\D/g, "").trim() || undefined;
    const fullPhoneNumber = cc && pn ? `${cc}${pn}` : undefined;

    await ensureUserDoc(cred.user.uid, {
      name: fullName || normalizedEmail,
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      email: normalizedEmail,
      sportInterest,
      joinAs,
      countryCode: cc,
      phoneNumber: pn,
      fullPhoneNumber,
      phone: fullPhoneNumber,
      bio: bio?.trim() || undefined,
      ...(avatarUrl ? { avatarUrl } : {}),
      agreedToTerms,
      wantsUpdates,
      status: "pending",
      role: "member",
      stats: { posts: 0, connections: 0, events: 0, likes: 0 },
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
      loginWithGoogle,
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

