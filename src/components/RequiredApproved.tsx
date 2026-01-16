"use client";
import { ProtectedRoute, useAuth } from "@/lib/AuthContext";

export function RequireApproved({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  return (
    <ProtectedRoute>
      {!currentUser?.userDoc ? (
        <p>Your profile is missing. Please re-register.</p>
      ) : currentUser.userDoc.status !== "approved" ? (
        <p>Your account is pending admin approval.</p>
      ) : (
        <>{children}</>
      )}
    </ProtectedRoute>
  );
}
