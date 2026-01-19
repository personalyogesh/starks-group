"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useAuth } from "@/lib/AuthContext";
import { getFirebaseStorageBucketTroubleshootingMessage, isFirebaseConfigured, storage } from "@/lib/firebaseClient";
import { createPostWithId, incrementUserPosts, newPostId } from "@/lib/firestore";
import { RequireApproved } from "@/components/RequireApproved";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function deriveTitle(body: string) {
  const s = body.trim().replace(/\s+/g, " ");
  if (!s) return "";
  return s.length <= 60 ? s : `${s.slice(0, 57)}...`;
}

function fileIsAllowedImage(f: File) {
  return f.type === "image/jpeg" || f.type === "image/png";
}

export default function CreatePostPage() {
  const { currentUser, loading } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [privacy, setPrivacy] = useState<"public" | "members" | "friends">("public");

  const MAX = 500;
  const MIN = 10;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const disabledReason = useMemo(() => {
    if (!isFirebaseConfigured) return "Firebase isn’t configured.";
    if (submitting) return "Publishing…";
    if (!user) return "Not logged in.";
    if (userDoc?.status !== "approved") return "Your account is pending admin approval.";
    const text = content.trim();
    if (!text && !file) return "Add some text or a photo.";
    if (text && text.length < MIN) return `Post must be at least ${MIN} characters (or add a photo).`;
    return null;
  }, [submitting, user, userDoc?.status, content]);

  const canSubmit = !disabledReason;

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

    const bucketHint = getFirebaseStorageBucketTroubleshootingMessage();
    if (bucketHint) {
      setMsg({ kind: "error", text: bucketHint });
      return;
    }

    const text = content.trim().slice(0, MAX);
    if (!text && !file) {
      setMsg({ kind: "error", text: "Please add some text or an image." });
      return;
    }
    if (text && text.length < MIN) {
      setMsg({ kind: "error", text: `Post must be at least ${MIN} characters (or add a photo).` });
      return;
    }

    if (file) {
      if (!fileIsAllowedImage(file)) {
        setMsg({ kind: "error", text: "Invalid format (JPG/PNG only)" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMsg({ kind: "error", text: "Image too large (max 5MB)" });
        return;
      }
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const postId = newPostId();
      let imageUrl: string | null = null;

      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `post-images/${user.uid}/${postId}/${Date.now()}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file, { contentType: file.type });
        imageUrl = await getDownloadURL(storageRef);
      }

      const authorName =
        userDoc?.name ||
        `${userDoc?.firstName ?? ""} ${userDoc?.lastName ?? ""}`.trim() ||
        user.email ||
        "Member";
      const authorRole = userDoc?.joinAs ?? (userDoc?.role === "admin" ? "admin" : "member");

      await createPostWithId(user.uid, postId, {
        // Prompt fields
        authorId: user.uid,
        authorName,
        ...(userDoc?.avatarUrl ? { authorAvatar: userDoc.avatarUrl } : {}),
        authorRole,
        content: text,
        privacy,
        imageUrl: imageUrl ?? undefined,
        likes: 0,
        likedBy: [],
        comments: [],

        // Back-compat fields used across the app today
        title: deriveTitle(text) || (file ? "Photo" : "Post"),
        body: text,
      });

      try {
        await incrementUserPosts(user.uid);
      } catch {
        // Non-blocking (older docs may not have stats, rules may restrict nested updates).
      }

      setMsg({ kind: "success", text: "Post published." });
      router.push("/dashboard");
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Failed to upload. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading post composer..." />;

  return (
    <RequireApproved>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ArrowLeft className="size-4" />
              Back to Dashboard
            </span>
          </Link>
          <Button
            variant="outline"
            disabled={!canSubmit}
            title={disabledReason ?? undefined}
            onClick={() => formRef.current?.requestSubmit()}
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
                  <div className="font-extrabold text-slate-950">{userDoc?.name ?? user?.email ?? "You"}</div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                    <span>Privacy</span>
                    <Select
                      value={privacy}
                      onChange={(e) => setPrivacy(e.target.value as any)}
                      className="w-[180px] bg-slate-100 border-slate-100"
                      aria-label="Privacy"
                    >
                      <option value="public">Public</option>
                      <option value="members">Members Only</option>
                      <option value="friends">Friends</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <textarea
                  className="w-full rounded-2xl border border-slate-100 bg-slate-100 px-4 py-4 text-base text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-40"
                  placeholder="What's on your mind? Share your thoughts, achievements, or experiences..."
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX))}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {content.trim().length >= MIN || Boolean(file)
                      ? "Ready to publish."
                      : `Write at least ${MIN} characters (or add a photo).`}
                  </span>
                  <span>
                    {content.length}/{MAX}
                  </span>
                </div>
              </div>

              {/* Image upload */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-bold text-slate-900">Add to your post</div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <span className="text-green-600">🖼️</span> Add Photo
                    <input
                      className="hidden"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50" disabled title="Coming soon">
                    ✂️ Crop
                  </button>
                  <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50" disabled title="Coming soon">
                    😊 Emoji
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

              {/* Templates */}
              <Card>
                <CardHeader>
                  <div className="text-xl font-extrabold tracking-tight text-brand-deep">Quick templates</div>
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
                        onClick={() => setContent((b) => (b.trim() ? b : t))}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </form>
          </CardBody>
        </Card>
      </div>
    </RequireApproved>
  );
}

