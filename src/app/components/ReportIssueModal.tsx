"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured, storage } from "@/lib/firebaseClient";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";

export type CapturedError = {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
};

async function captureScreenshotDataUrl(): Promise<string | null> {
  // Best-effort: try Screen Capture API (requires user gesture + permission).
  // If it fails, we still allow a report without screenshot.
  try {
    const anyNav: any = navigator as any;
    if (!anyNav?.mediaDevices?.getDisplayMedia) return null;
    const stream: MediaStream = await anyNav.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const video = document.createElement("video");
    video.playsInline = true;
    (video as any).srcObject = stream;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });

    // Some browsers require play() to render frames.
    try {
      await video.play();
    } catch {
      // ignore
    }

    const width = Math.max(1, Math.floor(video.videoWidth || 0));
    const height = Math.max(1, Math.floor(video.videoHeight || 0));
    if (width <= 1 || height <= 1) {
      stream.getTracks().forEach((t) => t.stop());
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas context");
    ctx.drawImage(video, 0, 0, width, height);

    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function ReportIssueModal({
  open,
  onOpenChange,
  error,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  error: CapturedError | null;
}) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const safeError = useMemo(() => error ?? { message: "Unknown error" }, [error]);

  async function submit() {
    if (!safeError) return;
    setSubmitting(true);
    try {
      let screenshotUrl: string | null = null;
      let reportId: string | null = null;

      // Try to capture screenshot (best-effort; user can deny permission)
      const shot = await captureScreenshotDataUrl();

      if (isFirebaseConfigured) {
        // Write report doc first
        const docRef = await addDoc(collection(db, "issueReports"), {
          createdAt: serverTimestamp(),
          uid: currentUser?.authUser?.uid ?? null,
          email: currentUser?.authUser?.email ?? null,
          pageUrl: typeof window !== "undefined" ? window.location.href : null,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          error: {
            message: safeError.message,
            code: safeError.code ?? null,
            stack: safeError.stack ?? null,
            context: safeError.context ?? null,
          },
          note: note.trim() || null,
          screenshotUrl: null,
          status: "new",
        });
        reportId = docRef.id;

        // Upload screenshot if we got one and the user is signed in (Storage rules likely require auth)
        if (shot && currentUser?.authUser?.uid) {
          try {
            const path = `issue-reports/${currentUser.authUser.uid}/${reportId}.png`;
            const sref = ref(storage, path);
            await uploadString(sref, shot, "data_url");
            screenshotUrl = await getDownloadURL(sref);
            // best-effort update (we keep it simple: no updateDoc helper import)
            await addDoc(collection(db, "issueReports", reportId, "attachments"), {
              createdAt: serverTimestamp(),
              type: "screenshot",
              url: screenshotUrl,
            });
          } catch {
            // ignore screenshot upload failures
          }
        }
      }

      const subject = encodeURIComponent("Starks App Issue Report");
      const body = encodeURIComponent(
        [
          "Hi Starks Group Team,",
          "",
          "A user reported an issue in the app.",
          "",
          `Page: ${typeof window !== "undefined" ? window.location.href : "unknown"}`,
          reportId ? `Report ID: ${reportId}` : "",
          screenshotUrl ? `Screenshot: ${screenshotUrl}` : "",
          "",
          `Message: ${safeError.message}`,
          safeError.code ? `Code: ${safeError.code}` : "",
          "",
          note.trim() ? `User note: ${note.trim()}` : "",
          "",
          "Thanks,",
          "Starks Cricket App",
        ]
          .filter(Boolean)
          .join("\n")
      );

      // Open mail client (no backend email needed)
      window.location.href = `mailto:starksgroup@starksgrp.org?subject=${subject}&body=${body}`;

      toast({ kind: "success", title: "Report prepared", description: "Your email app should open with the report details." });
      onOpenChange(false);
      setNote("");
    } catch (e: any) {
      toast({ kind: "error", title: "Report failed", description: e?.message ?? "Failed to prepare report." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Report an issue"
      onClose={() => onOpenChange(false)}
      maxWidthClassName="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="dark" onClick={submit} disabled={submitting}>
            {submitting ? "Preparing..." : "Report"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          <div className="font-semibold">What happened</div>
          <div className="mt-1">{safeError.message}</div>
          {safeError.code && <div className="mt-1 text-slate-600">code: {safeError.code}</div>}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-900">Add a note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary min-h-24"
            placeholder="What were you trying to do? Any steps to reproduce?"
          />
          <div className="text-xs text-slate-500">
            When you click Report, we’ll open an email to <b>starksgroup@starksgrp.org</b>. If you allow it, we may attach a
            screenshot.
          </div>
        </div>
      </div>
    </Modal>
  );
}

