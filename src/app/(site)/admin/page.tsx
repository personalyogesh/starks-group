"use client";

import Link from "next/link";
import { RequireAdmin } from "@/components/RequireAdmin";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { isFirebaseConfigured, db } from "@/lib/firebaseClient";
import {
  setUserApproval,
  setUserJoinAs,
  deleteUserDoc,
  deletePostsByUser,
  setUserRole,
  setUserSuspended,
  UserDoc,
  UserRole,
  UserStatus,
} from "@/lib/firestore";
import {
  collection,
  getCountFromServer,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { adminDeleteAuthUser } from "@/lib/adminFunctions";

export default function AdminPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<{
    totalUsers: number | null;
    activeMembers: number | null;
    totalPosts: number | null;
    pendingApprovals: number | null;
  }>({
    totalUsers: null,
    activeMembers: null,
    totalPosts: null,
    pendingApprovals: null,
  });

  const [users, setUsers] = useState<Array<{ id: string; data: UserDoc }>>([]);
  const [qText, setQText] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "member" | "volunteer" | "coach" | "admin">("");
  const [statusFilter, setStatusFilter] = useState<"" | UserStatus>("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{ open: boolean; email: string; name: string }>({
    open: false,
    email: "",
    name: "",
  });
  const [emailBody, setEmailBody] = useState(
    "Hi {{name}},\n\nJust a quick note from Starks Cricket.\n\nThanks,\nStarks Cricket Admin"
  );

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let cancelled = false;
    async function loadCounts() {
      const usersRef = collection(db, "users");
      const postsRef = collection(db, "posts");
      const cutoff = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [usersCount, activeCount, pendingCount, postsCount] = await Promise.all([
        getCountFromServer(query(usersRef)),
        // "Active members" per prompt = last login in last 30 days.
        getCountFromServer(query(usersRef, where("lastLoginAt", ">=", cutoff))),
        getCountFromServer(query(usersRef, where("status", "==", "pending"))),
        getCountFromServer(query(postsRef)),
      ]);

      if (cancelled) return;
      setStats({
        totalUsers: usersCount.data().count,
        activeMembers: activeCount.data().count,
        pendingApprovals: pendingCount.data().count,
        totalPosts: postsCount.data().count,
      });
    }

    loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, "users"), orderBy("requestedAt", "desc"), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, data: d.data() as UserDoc })));
      },
      (err) => {
        console.warn("[AdminPage] users listener error", { err });
        setUsers([]);
      }
    );
  }, []);

  const displayRole = (u: UserDoc): "member" | "volunteer" | "coach" | "admin" => {
    if (u.role === "admin") return "admin";
    const j = (u.joinAs ?? "").toLowerCase();
    if (j === "volunteer") return "volunteer";
    if (j === "coach") return "coach";
    return "member";
  };

  const filteredUsers = useMemo(() => {
    const t = qText.trim().toLowerCase();
    const base = users.filter(({ data }) => {
      if (roleFilter && displayRole(data) !== roleFilter) return false;
      if (statusFilter && data.status !== statusFilter) return false;
      if (!t) return true;
      return (
        (data.name ?? "").toLowerCase().includes(t) ||
        (data.email ?? "").toLowerCase().includes(t)
      );
    });
    base.sort((a, b) => {
      const ad = (a.data.requestedAt as Timestamp | undefined)?.toDate?.().getTime?.() ?? 0;
      const bd = (b.data.requestedAt as Timestamp | undefined)?.toDate?.().getTime?.() ?? 0;
      return sortDir === "desc" ? bd - ad : ad - bd;
    });
    return base;
  }, [users, qText, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [qText, roleFilter, statusFilter, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmt = (n: number | null) =>
    typeof n === "number" ? n.toLocaleString() : "—";

  const fmtJoinDate = (v: any) => {
    const ts: Timestamp | null =
      v && typeof v === "object" && typeof (v as Timestamp).toDate === "function"
        ? (v as Timestamp)
        : null;
    if (!ts) return "—";
    return ts.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const statusBadge = (s: UserStatus) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "pending") return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const roleBadge = (r: UserRole) =>
    r === "admin" ? "bg-slate-100 text-slate-900 border-slate-200" : "bg-slate-50 text-slate-700 border-slate-200";

  const roleLabel = (u: UserDoc) => {
    const r = displayRole(u);
    return r === "admin" ? "Admin" : r === "coach" ? "Coach" : r === "volunteer" ? "Volunteer" : "Member";
  };

  const rolePill = (u: UserDoc) => {
    const r = displayRole(u);
    return r === "admin"
      ? "bg-slate-100 text-slate-900 border-slate-200"
      : r === "coach"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : r === "volunteer"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-50 text-slate-700 border-slate-200";
  };

  const suspendedBadge = (s?: boolean) =>
    s ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <RequireAdmin>
      <div className="space-y-8">
        {/* Admin header row (per mockup) */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Starks Cricket Admin</h1>
            <p className="text-slate-500 mt-1">Estd. 2018</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
              🛡️ Administrator
            </span>
            <Link href="/">
              <Button variant="outline">Back to Feed</Button>
            </Link>
          </div>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to <code>.env.local</code>.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={fmt(stats.totalUsers)} hint="+12% from last month" />
          <StatCard title="Active Members" value={fmt(stats.activeMembers)} hint="+8% from last month" />
          <StatCard title="Total Posts" value={fmt(stats.totalPosts)} hint="+24% from last month" />
          <StatCard
            title="Pending Approvals"
            value={fmt(stats.pendingApprovals)}
            hint={
              (stats.pendingApprovals ?? 0) > 0 ? "Requires attention" : "All caught up"
            }
            danger={(stats.pendingApprovals ?? 0) > 0}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <div className="font-bold text-lg">Quick Actions</div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3">
                <Link href="/admin/users">
                  <Button variant="dark" className="w-full">
                    👤 Add New User
                  </Button>
                </Link>
                <Link href="/?adminCarousel=1">
                  <Button variant="outline" className="w-full">
                    🖼️ Manage Landing Carousel
                  </Button>
                </Link>
                <Link href="/create-post">
                  <Button variant="outline" className="w-full">
                    📝 Create Post
                  </Button>
                </Link>
                <Button variant="outline" className="w-full" disabled title="Coming soon">
                  ✉️ Send Newsletter
                </Button>
                <Button variant="outline" className="w-full" disabled title="Coming soon">
                  ⬇️ Export Data
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* User management */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-bold text-lg">User Management</div>
                  <div className="text-sm text-slate-600 mt-1">
                    Manage members, coaches, and volunteers
                  </div>
                </div>
                <Link href="/admin/users">
                  <Button variant="dark">➕ Add User</Button>
                </Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px] gap-3 items-center">
                <div className="relative">
                  <Input
                    className="bg-slate-100 border-slate-100 pl-10"
                    placeholder="Search users by name, email, or sport..."
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
                </div>

                <Select
                  className="bg-white"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                  <option value="">All Roles</option>
                  <option value="member">Member</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="coach">Coach</option>
                  <option value="admin">Admin</option>
                </Select>

                <Select className="bg-white" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
                  <option value="desc">Join Date: Newest</option>
                  <option value="asc">Join Date: Oldest</option>
                </Select>

                <Select
                  className="bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="">All Status</option>
                  <option value="approved">Active</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-[920px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Avatar</th>
                      <th className="text-left font-semibold px-4 py-3">Name</th>
                      <th className="text-left font-semibold px-4 py-3">Email</th>
                      <th className="text-left font-semibold px-4 py-3">Role</th>
                      <th className="text-left font-semibold px-4 py-3">Join Date</th>
                      <th className="text-left font-semibold px-4 py-3">Status</th>
                      <th className="text-left font-semibold px-4 py-3">Suspended</th>
                      <th className="text-right font-semibold px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {pageUsers.map(({ id, data }) => (
                      <tr key={id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 relative">
                            {data.avatarUrl ? (
                              // Firebase Storage URLs can be on varying domains; avoid next/image domain config needs.
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={data.avatarUrl} alt="" className="h-10 w-10 object-cover" />
                            ) : (
                              (data.name ?? "U").slice(0, 1).toUpperCase()
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{data.name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{data.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 font-semibold",
                              rolePill(data),
                            ].join(" ")}
                          >
                            {roleLabel(data)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{fmtJoinDate(data.requestedAt)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 font-semibold",
                              statusBadge(data.status),
                            ].join(" ")}
                          >
                            {data.status === "approved"
                              ? "Active"
                              : data.status === "pending"
                              ? "Pending"
                              : "Rejected"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 font-semibold",
                              suspendedBadge(Boolean(data.suspended)),
                            ].join(" ")}
                          >
                            {data.suspended ? "Suspended" : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <details className="relative inline-block">
                            <summary className="list-none cursor-pointer rounded-xl px-3 py-2 hover:bg-slate-100">
                              ⋮
                            </summary>
                            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white shadow-lg p-2 z-10">
                              <Link
                                className="block w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                href={`/members/${id}`}
                              >
                                View Profile
                              </Link>
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={() => {
                                  setEmailModal({ open: true, email: data.email, name: data.name });
                                }}
                              >
                                Send Email
                              </button>
                              <div className="h-px bg-slate-100 my-1" />
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  try {
                                    await setUserApproval(id, "approved");
                                    toast({ kind: "success", title: "User approved" });
                                  } catch (e: any) {
                                    toast({ kind: "error", title: "Approve failed", description: e?.message });
                                  } finally {
                                    setBusyUserId(null);
                                  }
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  try {
                                    await setUserApproval(id, "rejected");
                                    toast({ kind: "success", title: "User suspended (status rejected)" });
                                  } catch (e: any) {
                                    toast({ kind: "error", title: "Suspend failed", description: e?.message });
                                  } finally {
                                    setBusyUserId(null);
                                  }
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Suspend
                              </button>
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  try {
                                    await setUserSuspended(id, !Boolean(data.suspended));
                                    toast({
                                      kind: "success",
                                      title: Boolean(data.suspended) ? "User unsuspended" : "User suspended",
                                    });
                                  } catch (e: any) {
                                    toast({ kind: "error", title: "Suspend toggle failed", description: e?.message });
                                  } finally {
                                    setBusyUserId(null);
                                  }
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                {data.suspended ? "Unsuspend" : "Suspend (flag)"}
                              </button>
                              <div className="h-px bg-slate-100 my-1" />
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  await setUserRole(id, "member");
                                  await setUserJoinAs(id, "Player");
                                  toast({ kind: "success", title: "Role updated", description: "Set Member" });
                                  setBusyUserId(null);
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Set Member
                              </button>
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  await setUserRole(id, "member");
                                  await setUserJoinAs(id, "Volunteer");
                                  toast({ kind: "success", title: "Role updated", description: "Set Volunteer" });
                                  setBusyUserId(null);
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Set Volunteer
                              </button>
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  await setUserRole(id, "member");
                                  await setUserJoinAs(id, "Coach");
                                  toast({ kind: "success", title: "Role updated", description: "Set Coach" });
                                  setBusyUserId(null);
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Set Coach
                              </button>
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  setBusyUserId(id);
                                  try {
                                    await setUserRole(id, "admin");
                                    toast({ kind: "success", title: "Role updated", description: "Set Admin" });
                                  } catch (e: any) {
                                    toast({ kind: "error", title: "Role update failed", description: e?.message });
                                  } finally {
                                    setBusyUserId(null);
                                  }
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Set Admin
                              </button>
                              <div className="h-px bg-slate-100 my-1" />
                              <button
                                type="button"
                                className="w-full text-left rounded-xl px-3 py-2 hover:bg-slate-50 text-rose-700"
                                onClick={async () => {
                                  if (!isFirebaseConfigured) return;
                                  const ok = window.confirm(
                                    "Delete this user from Firestore? (Client apps cannot delete Firebase Auth users without an admin server.)"
                                  );
                                  if (!ok) return;

                                  const deletePosts = window.confirm("Also delete this user's posts?");
                                  setBusyUserId(id);
                                  try {
                                    if (deletePosts) {
                                      const n = await deletePostsByUser(id, { limit: 200 });
                                      toast({
                                        kind: "info",
                                        title: "Posts deleted",
                                        description: `Deleted ${n} posts (up to 200).`,
                                      });
                                    }
                                    // Attempt to delete the Firebase Auth user via callable function (if configured).
                                    try {
                                      await adminDeleteAuthUser(id);
                                      toast({ kind: "success", title: "Auth user deleted" });
                                    } catch (e) {
                                      // Client apps cannot delete Auth users without an admin server; allow fallback.
                                      toast({
                                        kind: "error",
                                        title: "Auth deletion unavailable",
                                        description: "Continuing with Firestore delete only.",
                                      });
                                    }

                                    await deleteUserDoc(id);
                                    toast({ kind: "success", title: "User deleted (Firestore doc)" });
                                  } catch (e: any) {
                                    toast({ kind: "error", title: "Delete failed", description: e?.message });
                                  } finally {
                                    setBusyUserId(null);
                                  }
                                }}
                                disabled={!isFirebaseConfigured || busyUserId === id}
                              >
                                Delete User
                              </button>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                    {pageUsers.length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-slate-600" colSpan={7}>
                          No users match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Prev
                  </Button>
                  <div className="text-xs text-slate-600">
                    Page <b>{page}</b> / {pageCount}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {emailModal.open && (
        <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-extrabold tracking-tight">Send Email</div>
                <div className="text-sm text-slate-600 mt-1">
                  To: <b>{emailModal.email}</b>
                </div>
              </div>
              <button
                type="button"
                className="h-10 w-10 rounded-2xl hover:bg-slate-50 border border-slate-200"
                onClick={() => setEmailModal({ open: false, email: "", name: "" })}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              <label className="text-sm font-semibold">Template</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm min-h-44 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
              <div className="text-xs text-slate-500">
                MVP uses your email client via <code>mailto:</code>. We can wire Cloud Functions later.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setEmailModal({ open: false, email: "", name: "" })}
              >
                Cancel
              </Button>
              <Button
                variant="dark"
                type="button"
                onClick={() => {
                  const body = emailBody.replaceAll("{{name}}", emailModal.name || "there");
                  window.location.href = `mailto:${encodeURIComponent(emailModal.email)}?subject=${encodeURIComponent(
                    "Starks Cricket"
                  )}&body=${encodeURIComponent(body)}`;
                  setEmailModal({ open: false, email: "", name: "" });
                  toast({ kind: "success", title: "Opened your email client" });
                }}
              >
                Open Email Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </RequireAdmin>
  );
}

function StatCard({
  title,
  value,
  hint,
  danger,
}: {
  title: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="text-slate-500">{title}</div>
      <div className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">{value}</div>
      <div className={["mt-6 text-sm font-semibold", danger ? "text-orange-700" : "text-emerald-700"].join(" ")}>
        {danger ? "🧡 " : "↗ "} {hint}
      </div>
    </div>
  );
}

