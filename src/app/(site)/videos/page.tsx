"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/AuthContext";
import { createVideo, listenCollection, VideoDoc } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { useToast } from "@/components/ui/ToastProvider";

export default function VideosPage() {
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const isAdmin = userDoc?.role === "admin";

  const [videos, setVideos] = useState<Array<{ id: string; data: VideoDoc }>>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<VideoDoc>("videos", setVideos, {
      orderByField: "addedDate",
      direction: "desc",
      limit: 50,
    });
  }, []);

  const parsedId = useMemo(() => extractYouTubeVideoId(url), [url]);

  async function add() {
    if (!user) return;
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Firebase not configured" });
      return;
    }
    if (!parsedId) {
      toast({ kind: "error", title: "Invalid YouTube URL", description: "Paste a valid YouTube link or video ID." });
      return;
    }
    if (!title.trim()) {
      toast({ kind: "error", title: "Title required" });
      return;
    }
    setSaving(true);
    try {
      await createVideo(user.uid, {
        videoId: parsedId,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setUrl("");
      setTitle("");
      setDescription("");
      toast({ kind: "success", title: "Video added" });
    } catch (e: any) {
      toast({ kind: "error", title: "Add failed", description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Videos</h1>
          <p className="text-slate-600 mt-1">Curated YouTube videos for the club.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to <code>.env.local</code>.
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="font-bold">Add video</div>
            <div className="text-sm text-slate-600 mt-1">Paste a YouTube URL, set title/description.</div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 max-w-2xl">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">YouTube URL (or video ID)</label>
                <Input
                  className="bg-slate-100 border-slate-100"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                {url.trim() && (
                  <div className="text-xs text-slate-500">
                    Parsed ID: <b>{parsedId ?? "—"}</b>
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Title</label>
                <Input
                  className="bg-slate-100 border-slate-100"
                  placeholder="Training Tips: Batting Basics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Description (optional)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
                  placeholder="Why we recommend this video..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="dark" type="button" onClick={add} disabled={saving || !user || !parsedId || !title.trim()}>
                  {saving ? "Adding..." : "Add Video"}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="font-bold">All videos</div>
          <div className="text-sm text-slate-600 mt-1">Latest added first.</div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <p>Loading...</p>
          ) : videos.length === 0 ? (
            <p className="text-slate-700">No videos yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map(({ id, data }) => (
                <div key={id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="relative aspect-[16/9] bg-black">
                    <iframe
                      className="absolute inset-0 h-full w-full"
                      src={`https://www.youtube.com/embed/${data.videoId}`}
                      title={data.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-slate-900">{data.title}</div>
                    {data.description && (
                      <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{data.description}</div>
                    )}
                    <div className="mt-3">
                      <Link href={`https://www.youtube.com/watch?v=${data.videoId}`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          Open on YouTube
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

