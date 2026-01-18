import { RequireAdmin } from "@/components/RequireAdmin";
import AdminPartnersPage from "@/app/components/AdminPartnersPage";

export default function AdminPartnersRoute() {
  return (
    <RequireAdmin>
      <AdminPartnersPage />
    </RequireAdmin>
  );
}

