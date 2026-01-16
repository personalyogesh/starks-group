"use client";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";

export default function MembersPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="text-2xl font-extrabold tracking-tight">Community</div>
          <div className="text-sm text-slate-600 mt-1">Members directory (coming soon).</div>
        </CardHeader>
        <CardBody>
          <p className="text-slate-700">
            Next: realtime members list from Firestore <code>users</code> with search + connect.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

