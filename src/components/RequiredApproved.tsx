"use client";
import { useAuth } from "./AuthProvider";

export function RequireApproved({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please login to interact.</p>;
  if (!userDoc) return <p>Your profile is missing. Please re-register.</p>;
  if (userDoc.status !== "approved") return <p>Your account is pending admin approval.</p>;

  return <>{children}</>;
}
