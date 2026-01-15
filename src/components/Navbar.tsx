"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebaseClient";
import { useAuth } from "./AuthProvider";

export default function Navbar() {
  const { user, userDoc } = useAuth();
  console.log("NAVBAR AUTH:", user?.email ?? "NOT LOGGED IN");


  return (
    <div style={{ display: "flex", gap: 16, padding: 16, borderBottom: "1px solid #e5e5e5" }}>
      <Link href="/" style={{ fontWeight: 700 }}>Starks Group</Link>
      <Link href="/">Home</Link>
      <Link href="/register">Register</Link>
      <Link href="/login">Login</Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        {!isFirebaseConfigured && (
          <span style={{ fontSize: 12, color: "#666" }}>Firebase not configured</span>
        )}
        {user && (
          <>
            <span style={{ fontSize: 12 }}>
              {user.email} • {userDoc?.status ?? "no-profile"}
            </span>
            {userDoc?.role === "admin" && <Link href="/admin">Admin</Link>}
            <button disabled={!auth} onClick={() => auth && signOut(auth)}>
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
