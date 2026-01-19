"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/lib/AuthContext";
import { listenCollection, createPost, deletePost, PostDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  QueryDocumentSnapshot,
  DocumentData,
  Query,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  writeBatch,
} from "firebase/firestore";

export default function AdminPostsPage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fixing, setFixing] = useState(false);
  const [fixMsg, setFixMsg] = useState<string | null>(null);
  const [fixStats, setFixStats] = useState<{ scanned: number; updated: number } | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<PostDoc>("posts", setPosts);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    await createPost(user.uid, { title, body });
    setTitle("");
    setBody("");
  }

  async function normalizePrivacy() {
    if (!isFirebaseConfigured) return;
    if (!user) return;
    const ok = window.confirm(
      "Normalize post privacy fields?\n\nThis will:\n- Trim + lowercase privacy values\n- Convert invalid/unknown values to 'members'\n\nThis helps prevent members from seeing 'Missing or insufficient permissions' when loading older posts."
    );
    if (!ok) return;

    setFixing(true);
    setFixMsg(null);
    setFixStats({ scanned: 0, updated: 0 });

    const allowed = new Set(["public", "members", "friends"]);
    const PAGE = 400;
    const MAX_PAGES = 25; // safety cap (10k docs max)

    try {
      let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        const q1: Query<DocumentData> = cursor
          ? query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE))
          : query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(PAGE));
        const snap = await getDocs(q1);
        if (snap.empty) break;

        const batch = writeBatch(db);
        let updatesThisPage = 0;

        for (const d of snap.docs) {
          const data = d.data() as any;
          const raw = data?.privacy;

          // Leave missing privacy alone (back-compat: treated as public by UI/rules).
          if (raw === undefined || raw === null) continue;

          let next: string | null = null;
          if (typeof raw === "string") {
            const norm = raw.trim().toLowerCase();
            if (!norm) next = "public";
            else if (allowed.has(norm)) next = norm;
            else next = "members";

            if (norm === raw && next === raw) continue;
          } else {
            // Unexpected type -> members
            next = "members";
          }

          if (next) {
            batch.update(d.ref, { privacy: next, updatedAt: serverTimestamp() });
            updatesThisPage++;
          }
        }

        // Always advance cursor; commit only if needed.
        cursor = snap.docs[snap.docs.length - 1] ?? cursor;
        setFixStats((prev) => ({
          scanned: (prev?.scanned ?? 0) + snap.size,
          updated: (prev?.updated ?? 0) + updatesThisPage,
        }));

        if (updatesThisPage > 0) await batch.commit();
        if (snap.size < PAGE) break;
      }

      setFixMsg("Done. Privacy fields normalized.");
    } catch (err: any) {
      setFixMsg(err?.message ?? "Failed to normalize privacy.");
    } finally {
      setFixing(false);
    }
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Manage Posts</h1>
          <p className="text-slate-600 mt-1">Share updates and announcements with the team.</p>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to{" "}
            <code>.env.local</code>.
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="font-bold">Maintenance</div>
            <div className="text-sm text-slate-600 mt-1">
              Fix legacy/invalid post privacy values to prevent members seeing permission errors when loading older posts.
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-700">
                {fixStats ? (
                  <div>
                    scanned: <b>{fixStats.scanned}</b> · updated: <b>{fixStats.updated}</b>
                  </div>
                ) : (
                  <div>Normalize privacy values to one of: public / members / friends.</div>
                )}
                {fixMsg && <div className="mt-1 text-slate-600">{fixMsg}</div>}
              </div>
              <Button disabled={!isFirebaseConfigured || fixing} onClick={normalizePrivacy} variant="outline">
                {fixing ? "Fixing…" : "Fix privacy fields"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold">New post</div>
            <div className="text-sm text-slate-600 mt-1">Keep it short and punchy.</div>
          </CardHeader>
          <CardBody>
            <form onSubmit={add} className="grid gap-4 max-w-2xl">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Title</label>
                <Input
                  placeholder="Weekend match confirmed"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Body</label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-28"
                  placeholder="Meet at 9:30am. Bring whites + water."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button disabled={!isFirebaseConfigured} type="submit">
                  Add post
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold">Published</div>
            <div className="text-sm text-slate-600 mt-1">Latest appears first on the homepage.</div>
          </CardHeader>
          <CardBody>
            {posts.length === 0 ? (
              <p className="text-slate-600">
                {isFirebaseConfigured ? "No posts yet." : "Connect Firebase to load posts."}
              </p>
            ) : (
              <div className="grid gap-3">
                {posts.map(({ id, data }) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold">{data.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        privacy: <b>{(data as any).privacy ?? "—"}</b>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{data.body}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => deletePost(id)}
                      disabled={!isFirebaseConfigured}
                    >
                      Delete
                    </Button>
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

