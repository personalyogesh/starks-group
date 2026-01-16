"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/lib/AuthContext";
import { listenCollection, createLink, deleteLink, LinkDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdminLinksPage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const [links, setLinks] = useState<Array<{ id: string; data: LinkDoc }>>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<LinkDoc>("links", setLinks);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    await createLink(user.uid, { title, url });
    setTitle("");
    setUrl("");
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Manage Links</h1>
          <p className="text-slate-600 mt-1">Publish useful links for the team.</p>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to{" "}
            <code>.env.local</code>.
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="font-bold">New link</div>
            <div className="text-sm text-slate-600 mt-1">
              Examples: match signup form, WhatsApp group, Instagram.
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={add} className="grid gap-4 max-w-2xl">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Title</label>
                <Input
                  placeholder="Team WhatsApp"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">URL</label>
                <Input
                  placeholder="https://..."
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button disabled={!isFirebaseConfigured} type="submit">
                  Add link
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold">Published</div>
            <div className="text-sm text-slate-600 mt-1">Visible on the homepage.</div>
          </CardHeader>
          <CardBody>
            {links.length === 0 ? (
              <p className="text-slate-600">
                {isFirebaseConfigured ? "No links yet." : "Connect Firebase to load links."}
              </p>
            ) : (
              <div className="grid gap-3">
                {links.map(({ id, data }) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold">{data.title}</div>
                      <a
                        href={data.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-brand-primary hover:underline break-all"
                      >
                        {data.url}
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => deleteLink(id)}
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

