"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ProtectedRoute, useAuth } from "@/lib/AuthContext";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  if (loading) return <p>Loading...</p>;

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.userDoc?.role !== "admin") router.replace("/dashboard");
  }, [currentUser, router]);

  return (
    <ProtectedRoute>
      {currentUser?.userDoc?.role !== "admin" ? null : <>{children}</>}
    </ProtectedRoute>
  );
}
