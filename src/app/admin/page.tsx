"use client";

import Link from "next/link";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function AdminPage() {
  return (
    <RequireAdmin>
      <div style={{ display: "grid", gap: 12 }}>
        <h1>Admin</h1>
        <ul>
          <li><Link href="/admin/users">Approve Users</Link></li>
          <li><Link href="/admin/events">Manage Events</Link></li>
          <li><Link href="/admin/links">Manage Links</Link></li>
          <li><Link href="/admin/posts">Manage Posts</Link></li>
          <li><Link href="/admin/qrcodes">QR Codes</Link></li>
        </ul>
      </div>
    </RequireAdmin>
  );
}
