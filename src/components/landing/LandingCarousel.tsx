"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/AuthContext";
import { storage, isFirebaseConfigured, getFirebaseStorageBucketTroubleshootingMessage } from "@/lib/firebaseClient";
import {
  CarouselSlideDoc,
  createCarouselSlide,
  deleteCarouselSlide,
  listenCollection,
} from "@/lib/firestore";
import { normalizeImageFileForWeb } from "@/lib/imageUpload";

function tsToMs(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  const d = new Date(ts);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatDate(ts: any): string {
  const ms = tsToMs(ts);
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
}

function formatFirebaseStorageError(err: any): string {
  const code = err?.code ? String(err.code) : "";
  const message = err?.message ? String(err.message) : "Upload failed";
  const server = err?.customData?.serverResponse ? String(err.customData.serverResponse) : "";

  // Common actionable hints
  if (code.includes("storage/unauthorized") || code.includes("storage/unauthenticated")) {
    return (
      `${message}${code ? ` (code: ${code})` : ""}\n\n` +
      "This usually means your Firebase Storage Rules are blocking uploads. In Firebase Console → Storage → Rules, " +
      "ensure authenticated users are allowed to write (or allow only admins if you prefer)."
    );
  }
  if ((server || message).toLowerCase().includes("app check")) {
    return (
      `${message}${code ? ` (code: ${code})` : ""}\n\n` +
      "It looks like Firebase App Check may be enforced for Storage. Either disable enforcement in Firebase Console " +
      "or add App Check initialization in the client."
    );
  }

  return [message, code ? `code: ${code}` : "", server ? `server: ${server}` : ""]
    .filter(Boolean)
    .join("\n");
}

export default function LandingCarousel({
  fallbackImageUrl = "/hero.jpg",
  fallbackTitle = "Starks Cricket Club",
  fallbackNote = "Building communities through cricket since 2018.",
}: {
  fallbackImageUrl?: string;
  fallbackTitle?: string;
  fallbackNote?: string;
}) {
  const { currentUser } = useAuth();
  const isAdmin = Boolean(currentUser?.authUser && currentUser?.userDoc?.role === "admin");

  const [slides, setSlides] = useState<Array<{ id: string; data: CarouselSlideDoc }>>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Admin UI
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("adminCarousel") === "1") setOpen(true);
  }, [isAdmin]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<CarouselSlideDoc>("carouselSlides", setSlides, {
      orderByField: "createdAt",
      direction: "desc",
      limit: 20,
      onError: (err) => console.warn("[LandingCarousel] listen error", err),
    });
  }, []);

  const effectiveSlides = useMemo(() => {
    if (!isFirebaseConfigured || slides.length === 0) {
      return [
        {
          id: "fallback",
          data: {
            title: fallbackTitle,
            note: fallbackNote,
            imageUrl: fallbackImageUrl,
            createdAt: null,
            createdBy: "system",
          } as CarouselSlideDoc,
        },
      ];
    }
    return slides;
  }, [slides, fallbackTitle, fallbackNote, fallbackImageUrl]);

  useEffect(() => {
    if (idx >= effectiveSlides.length) setIdx(0);
  }, [idx, effectiveSlides.length]);

  useEffect(() => {
    if (paused) return;
    if (effectiveSlides.length <= 1) return;
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % effectiveSlides.length);
    }, 6000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [effectiveSlides.length, paused]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const active = effectiveSlides[idx]?.data;

  const disabledReason = useMemo(() => {
    if (!isAdmin) return "Admin access required.";
    if (!isFirebaseConfigured) return "Firebase isn’t configured.";
    if (saving) return "Saving…";
    const hint = getFirebaseStorageBucketTroubleshootingMessage();
    if (hint) return "Firebase Storage bucket is misconfigured.";
    if (!title.trim()) return "Please enter a header.";
    if (!file) return "Please choose an image.";
    return null;
  }, [isAdmin, saving, title, file]);

  const canSave = !disabledReason;

  async function onPickFile(f: File | null) {
    setMsg(null);
    if (!f) {
      setFile(null);
      return;
    }
    try {
      const normalized = await normalizeImageFileForWeb(f);
      setFile(normalized);
    } catch (e: any) {
      setMsg(e?.message ?? "Could not process this image.");
      setFile(null);
    }
  }

  async function saveSlide() {
    if (!currentUser?.authUser) return;
    const uid = currentUser.authUser.uid;
    const hint = getFirebaseStorageBucketTroubleshootingMessage();
    if (hint) {
      setMsg(hint);
      return;
    }
    if (!file) return;

    setSaving(true);
    setMsg(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const storagePath = `carousel/${uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
      const imageUrl = await getDownloadURL(storageRef);
      await createCarouselSlide(uid, {
        title: title.trim(),
        note: note.trim() || undefined,
        imageUrl,
        storagePath,
      });
      setTitle("");
      setNote("");
      setFile(null);
      setPreviewUrl(null);
    } catch (e: any) {
      setMsg(formatFirebaseStorageError(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeSlide(id: string, s: CarouselSlideDoc) {
    if (!confirm("Delete this slide?")) return;
    setMsg(null);
    try {
      await deleteCarouselSlide(id);
      if (s.storagePath && isFirebaseConfigured) {
        await deleteObject(ref(storage, s.storagePath));
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to delete slide");
    }
  }

  return (
    <div
      className="relative rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/10] bg-slate-200">
        <Image
          src={active?.imageUrl || fallbackImageUrl}
          alt={active?.title || "Starks Cricket"}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />

        {/* Caption */}
        <div className="absolute left-4 right-4 bottom-4">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-4 py-3 text-white">
            <div className="font-extrabold tracking-tight text-lg">{active?.title || fallbackTitle}</div>
            {(active?.note || fallbackNote) && (
              <div className="text-sm text-white/85 mt-0.5 line-clamp-2">{active?.note || fallbackNote}</div>
            )}
          </div>
        </div>

        {/* Controls */}
        {effectiveSlides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-2xl bg-white/85 hover:bg-white text-slate-900 border border-white/40"
              onClick={() => setIdx((i) => (i - 1 + effectiveSlides.length) % effectiveSlides.length)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-2xl bg-white/85 hover:bg-white text-slate-900 border border-white/40"
              onClick={() => setIdx((i) => (i + 1) % effectiveSlides.length)}
            >
              ›
            </button>
            <div className="absolute left-0 right-0 top-3 flex justify-center gap-2">
              {effectiveSlides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className={[
                    "h-2.5 w-2.5 rounded-full border transition",
                    i === idx ? "bg-white border-white" : "bg-white/30 border-white/50 hover:bg-white/60",
                  ].join(" ")}
                />
              ))}
            </div>
          </>
        )}

        {/* Admin manage */}
        {isAdmin && (
          <div className="absolute right-3 top-3">
            <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(true)}>
              Manage Carousel
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={open}
        title="Manage Landing Carousel"
        onClose={() => {
          setOpen(false);
          setMsg(null);
        }}
        maxWidthClassName="max-w-3xl"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin">
              <Button variant="outline" type="button">
                ← Back to Admin
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button variant="dark" onClick={saveSlide} disabled={!canSave} title={disabledReason ?? undefined}>
                {saving ? "Saving..." : "Add Slide"}
              </Button>
            </div>
          </div>
        }
      >
        {msg && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {msg}
          </div>
        )}

        {!isFirebaseConfigured && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. Add your `NEXT_PUBLIC_FIREBASE_*` env vars to enable uploads and saving slides.
          </div>
        )}

        {getFirebaseStorageBucketTroubleshootingMessage() && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {getFirebaseStorageBucketTroubleshootingMessage()}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-xs text-slate-500">
              Tip: HEIC images from iPhone are supported — we’ll convert them to JPG on upload.
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-900">Header</label>
              <Input placeholder="e.g., Summer League Highlights" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-900">Short note (optional)</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-28"
                placeholder="One or two lines..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-900">Image</label>
              <input
                type="file"
                accept="image/*,.heic,.heif"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              {previewUrl && (
                <div className="relative aspect-[16/10] rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
                  <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                </div>
              )}
              {disabledReason && (
                <div className="text-xs text-slate-500">
                  Upload disabled: <span className="font-semibold">{disabledReason}</span>
                </div>
              )}
            </div>

            {/* Extra action button inside body so it’s impossible to miss */}
            <div className="pt-2">
              <Button
                variant="dark"
                className="w-full"
                onClick={saveSlide}
                disabled={!canSave}
                title={disabledReason ?? undefined}
              >
                {saving ? "Saving..." : "Add Slide"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-extrabold tracking-tight text-slate-900">Existing slides</div>
            <div className="grid gap-3 max-h-[420px] overflow-auto pr-1">
              {slides.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  No slides yet. Add your first slide on the left.
                </div>
              ) : (
                slides.map(({ id, data }) => (
                  <div key={id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex gap-3">
                      <div className="relative h-16 w-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                        <Image src={data.imageUrl} alt={data.title} fill className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{data.title}</div>
                        {data.note && <div className="text-xs text-slate-600 line-clamp-2">{data.note}</div>}
                        <div className="text-[11px] text-slate-500 mt-1">Created: {formatDate(data.createdAt)}</div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => removeSlide(id, data)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

