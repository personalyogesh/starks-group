"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { isFirebaseConfigured, db } from "@/lib/firebaseClient";
import { UserDoc, setUserApproval, setUserRole, UserRole, UserStatus } from "@/lib/firestore";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type Row = { id: string; data: UserDoc };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Row[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, "users"), orderBy("requestedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, data: d.data() as UserDoc })));
      },
      (err) => {
        console.warn("[AdminUsersPage] users listener error", { err });
        setUsers([]);
      }
    );
  }, []);

  const setStatus = async (uid: string, status: UserStatus) => {
    if (!isFirebaseConfigured) return;
    await setUserApproval(uid, status);
  };

  const setRole = async (uid: string, role: UserRole) => {
    if (!isFirebaseConfigured) return;
    await setUserRole(uid, role);
  };

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Approve Members</h1>
          <p className="text-slate-600 mt-1">
            Review registrations, approve access, and assign admin roles.
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to{" "}
            <code>.env.local</code>.
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="font-bold">Members</div>
            <div className="text-sm text-slate-600 mt-1">Newest requests appear first.</div>
          </CardHeader>
          <CardBody>
            {users.length === 0 ? (
              <p className="text-slate-600">
                {isFirebaseConfigured ? "No user records yet." : "Connect Firebase to load users."}
              </p>
            ) : (
              <div className="grid gap-3">
                {users.map(({ id, data }) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="font-semibold">{data.name}</div>
                        <div className="text-sm text-slate-600">{data.email}</div>
                        {data.phone && <div className="text-sm text-slate-600">{data.phone}</div>}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                          status: <b>{data.status}</b>
                        </span>
                        <span className="text-xs rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                          role: <b>{data.role}</b>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => setStatus(id, "approved")} disabled={!isFirebaseConfigured}>
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setStatus(id, "rejected")}
                        disabled={!isFirebaseConfigured}
                      >
                        Reject
                      </Button>

                      <div className="w-px bg-slate-200 mx-1" />

                      <Button
                        variant="secondary"
                        onClick={() => setRole(id, "member")}
                        disabled={!isFirebaseConfigured}
                      >
                        Member
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRole(id, "admin")}
                        disabled={!isFirebaseConfigured}
                      >
                        Make Admin
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAdmin>
  );
}

