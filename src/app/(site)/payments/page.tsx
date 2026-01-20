import PaymentPage from "@/app/components/PaymentPage";
import { ProtectedRoute } from "@/lib/AuthContext";

export default function Page() {
  return (
    <ProtectedRoute>
      <PaymentPage />
    </ProtectedRoute>
  );
}

