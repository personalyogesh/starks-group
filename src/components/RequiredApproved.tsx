"use client";
import { ProtectedRoute, useAuth } from "@/lib/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function RequireApproved({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Checking access..." />;

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
