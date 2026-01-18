"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ProtectedRoute, useAuth } from "@/lib/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!currentUser) return;
    if (currentUser.userDoc?.role !== "admin") router.replace("/dashboard");
  }, [loading, currentUser, router]);

  if (loading) return <LoadingSpinner message="Checking admin access..." />;

  return (
    <ProtectedRoute>
      {currentUser?.userDoc?.role !== "admin" ? null : <>{children}</>}
    </ProtectedRoute>
  );
}
