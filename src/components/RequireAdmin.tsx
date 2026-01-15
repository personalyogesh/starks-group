"use client";
import { useAuth } from "./AuthProvider";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please login.</p>;
  if (userDoc?.role !== "admin") return <p>Admins only.</p>;

  return <>{children}</>;
}
