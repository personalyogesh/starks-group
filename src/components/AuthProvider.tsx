"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import { getUser, UserDoc } from "@/lib/firestore";

type AuthCtx = {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, userDoc: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null);
      setUserDoc(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) setUserDoc(await getUser(u.uid));
      else setUserDoc(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ user, userDoc, loading }), [user, userDoc, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
