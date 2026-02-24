"use client";

import { useRouter } from "next/navigation";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/lib/AuthContext";
import { NotificationCenter } from "@/app/components/admin/NotificationCenter";

export default function AdminFinancialNotificationsPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  return (
    <RequireAdmin>
      <NotificationCenter
        currentUser={currentUser?.authUser}
        navigateTo={(page) => {
          if (page === "admin-dashboard") {
            router.push("/admin/financial");
            return;
          }
          if (page === "payment-tracking") {
            router.push("/admin/financial");
            return;
          }
          router.push("/admin/financial");
        }}
      />
    </RequireAdmin>
  );
}
