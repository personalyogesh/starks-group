"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getUser, UserDoc } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebaseClient";

export default function MemberProfilePage() {
  const params = useParams<{ uid: string }>();
  const uid = params.uid;

  const [doc, setDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isFirebaseConfigured) {
        setLoading(false);
        return;
      }
      const u = await getUser(uid);
      if (cancelled) return;
      setDoc(u);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Member Profile</h1>
          <p className="text-slate-600 mt-1">Public member view.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Feed</Button>
        </Link>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to{" "}
          <code>.env.local</code>.
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : !doc ? (
        <Card>
          <CardBody>
            <p className="text-slate-700">Member not found.</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="font-bold">{doc.name}</div>
            <div className="text-sm text-slate-600 mt-1">
              Status: <b>{doc.status}</b> · Join as: <b>{doc.joinAs ?? "—"}</b>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="relative mx-auto h-44 w-44 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                  {doc.avatarUrl ? (
                    <Image src={doc.avatarUrl} alt="" fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
                      No photo
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="Email" value={doc.email} />
                  <Info label="Phone" value={doc.phone ?? "—"} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="Sport interest" value={doc.sportInterest ?? "—"} />
                  <Info label="Role" value={doc.role} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900 break-words">{value}</div>
    </div>
  );
}

