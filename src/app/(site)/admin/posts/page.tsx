"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/lib/AuthContext";
import { listenCollection, createPost, deletePost, PostDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdminPostsPage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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

