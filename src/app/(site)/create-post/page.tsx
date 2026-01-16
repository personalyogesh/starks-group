"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useAuth } from "@/lib/AuthContext";
import { isFirebaseConfigured, storage } from "@/lib/firebaseClient";
import { createPost } from "@/lib/firestore";
import { RequireApproved } from "@/components/RequireApproved";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

function deriveTitle(body: string) {
  const s = body.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length <= 60 ? s : `${s.slice(0, 57)}...`;
}

export default function CreatePostPage() {
  const { currentUser, loading } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [visibility, setVisibility] = useState<"public" | "members">("public");

  const MAX = 800;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const canSubmit = useMemo(() => {
    if (!isFirebaseConfigured || submitting) return false;
    if (!user) return false;
    if (userDoc?.status !== "approved") return false;
    if (!body.trim()) return false;
    return true;
  }, [submitting, user, userDoc?.status, body]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!isFirebaseConfigured) {
      setMsg({
        kind: "error",
        text: "Firebase isn’t configured yet. Add NEXT_PUBLIC_FIREBASE_* to .env.local.",
      });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      let imageUrl: string | undefined;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `posts/${user.uid}/${Date.now()}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        imageUrl = await getDownloadURL(storageRef);
      }

      const text = body.trim().slice(0, MAX);
      await createPost(user.uid, { title: deriveTitle(text), body: text, imageUrl });
      router.push("/dashboard");
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Failed to create post" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <RequireApproved>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
            <span className="text-lg">←</span> Back
          </Link>
          <Button
            variant="outline"
            disabled={!canSubmit}
            onClick={() => {
              formRef.current?.requestSubmit();
            }}
          >
            Publish Post
          </Button>
        </div>

        {msg && (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm",
              msg.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900",
            ].join(" ")}
          >
            {msg.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="text-2xl font-extrabold tracking-tight">Create a Post</div>
          </CardHeader>
          <CardBody>
            <form ref={formRef} onSubmit={submit} className="grid gap-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-200 grid place-items-center font-bold text-slate-700">
                  You
                </div>
                <div className="flex-1">
                  <div className="font-extrabold text-slate-950">
                    {userDoc?.name ?? user?.email ?? "You"}
                  </div>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="capitalize">{visibility}</span>
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as any)}
                      className="bg-transparent text-slate-500 text-sm outline-none"
                      aria-label="Visibility"
                    >
                      <option value="public">Public</option>
                      <option value="members">Members</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <textarea
                  className="w-full rounded-2xl border border-slate-100 bg-slate-100 px-4 py-4 text-base outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-40"
                  placeholder="What's on your mind? Share your thoughts, achievements, or experiences..."
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{body.trim() ? "Ready to publish." : "Write something to enable publishing."}</span>
                  <span>
                    {body.length}/{MAX}
                  </span>
                </div>
              </div>

              {/* Add to your post */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-bold text-slate-900">Add to your post</div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <span className="text-green-600">🖼️</span> Photo
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <span className="text-red-600">📹</span> Video
                  </button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <span className="text-amber-600">😊</span> Feeling
                  </button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <span className="text-blue-600">📍</span> Location
                  </button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                    <span className="text-violet-600">🏷️</span> Tag
                  </button>
                </div>
              </div>

              {previewUrl && (
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-slate-100">
                    <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      className="absolute top-3 right-3 h-9 w-9 rounded-xl bg-white/95 border border-slate-200 grid place-items-center hover:bg-white"
                      aria-label="Remove image"
                      onClick={() => setFile(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              <Card>
                <CardHeader>
                  <div className="text-xl font-extrabold tracking-tight text-brand-deep">
                    Need inspiration?
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-3">
                    {[
                      "Share a training update",
                      "Announce event participation",
                      "Express gratitude",
                    ].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="w-full text-left rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 font-semibold"
                        onClick={() => setBody((b) => (b.trim() ? b : t))}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <div className="text-xl font-extrabold tracking-tight">Community Guidelines</div>
                </CardHeader>
                <CardBody>
                  <ul className="list-disc pl-5 text-slate-700 space-y-2">
                    <li>Be respectful and supportive of all members</li>
                    <li>Share authentic experiences and achievements</li>
                    <li>Avoid promotional or spam content</li>
                    <li>Respect privacy — don’t share others’ photos without permission</li>
                  </ul>
                </CardBody>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Button
                  variant="dark"
                  disabled={!canSubmit}
                  type="submit"
                  className="w-full"
                >
                  {submitting ? "Publishing..." : "Publish Post"}
                </Button>
                <Link href="/dashboard">
                  <Button variant="outline" type="button" className="w-full" disabled={submitting}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </RequireApproved>
  );
}

