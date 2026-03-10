"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  browserLocalPersistence,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  getClientAuth,
  getClientStorage,
  isFirebaseConfigured,
  getFirebaseStorageBucketTroubleshootingMessage,
} from "@/lib/firebaseClient";
import { ensureUserDoc, getUser, touchLastLogin, updateUserProfile, UserDoc } from "@/lib/firestore";

export type CurrentUser = {
  authUser: User;
  userDoc: UserDoc | null;
};

type GoogleLoginResult = {
  needsBirthday: boolean;
};

type AuthCtx = {
  currentUser: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<GoogleLoginResult>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  checkEmailAvailable: (email: string, currentEmail?: string | null) => Promise<boolean>;
  signup: (args: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    birthMonth?: number;
    birthDay?: number;
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
  loginWithGoogle: async () => ({ needsBirthday: false }),
  logout: async () => {},
  forgotPassword: async () => {},
  checkEmailAvailable: async () => true,
  signup: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  function requireAuth() {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase isn’t configured.");
    }
    const auth = getClientAuth();
    if (!auth) {
      throw new Error("Authentication service is not ready. Please refresh and try again.");
    }
    return auth;
  }

  function requireStorage() {
    const storage = getClientStorage();
    if (!storage) {
      throw new Error("Storage service is not ready. Please refresh and try again.");
    }
    return storage;
  }

  async function enforceUserStatus(uid: string, authClient: ReturnType<typeof getClientAuth>) {
    const doc = await getUser(uid);
    if (!doc) {
      await signOut(authClient);
      throw new Error("Account not found");
    }

    if (doc.suspended) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("starks:authError", "Your account is suspended. Please contact an administrator.");
        }
      } catch {
        // ignore
      }
      await signOut(authClient);
      throw new Error("Your account has been deactivated. Contact admin.");
    }

    if (doc.status === "pending") {
      await signOut(authClient);
      throw new Error("Account pending approval");
    }

    if (doc.status === "rejected") {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("starks:authError", "Your account has been deactivated. Contact admin.");
        }
      } catch {
        // ignore
      }
      await signOut(authClient);
      throw new Error("Account has been deactivated");
    }

    return doc;
  }

  useEffect(() => {
    let active = true;
    let unsub = () => {};
    const auth = getClientAuth();
    if (!isFirebaseConfigured || !auth) {
      setAuthUser(null);
      setUserDoc(null);
      setLoading(false);
      return;
    }

    unsub = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
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
        if (!active) return;
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
          if (!active) return;
          setAuthUser(null);
          setUserDoc(null);
        }
      }
      else setUserDoc(null);
      setLoading(false);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const login = async (email: string, password: string, remember = true) => {
    const auth = requireAuth();
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await enforceUserStatus(cred.user.uid, auth);
  };

  const loginWithGoogle = async (): Promise<GoogleLoginResult> => {
    const auth = requireAuth();

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
    if (doc?.suspended || doc?.status === "rejected") {
      await enforceUserStatus(cred.user.uid, auth);
    }
    // pending: allowed to remain signed in (read-only until approved)
    const latestDoc = doc ?? (await getUser(cred.user.uid));
    const needsBirthday = !latestDoc?.birthMonth || !latestDoc?.birthDay;
    return { needsBirthday };
  };

  const logout = async () => {
    const auth = getClientAuth();
    if (!isFirebaseConfigured || !auth) return;
    await signOut(auth);
  };

  const forgotPassword = async (email: string) => {
    const auth = requireAuth();
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  };

  const checkEmailAvailable = async (email: string, currentEmail?: string | null) => {
    const emailLower = email.trim().toLowerCase();
    if (!emailLower) return true;
    if (emailLower === (currentEmail ?? "").trim().toLowerCase()) return true;
    const auth = requireAuth();
    const methods = await fetchSignInMethodsForEmail(auth, emailLower);
    return methods.length === 0;
  };

  const signup: AuthCtx["signup"] = async ({
    email,
    password,
    firstName,
    lastName,
    birthMonth,
    birthDay,
    sportInterest,
    joinAs,
    countryCode,
    phoneNumber,
    bio,
    avatarFile,
    agreedToTerms,
    wantsUpdates,
  }) => {
    const auth = requireAuth();

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
      const storage = requireStorage();
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
      birthMonth,
      birthDay,
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
      forgotPassword,
      checkEmailAvailable,
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

