"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { useAuth } from "@/lib/AuthContext";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { listenCollection, EventDoc, PostDoc, getUser, UserDoc, VideoDoc } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import PostCard from "@/components/feed/PostCard";

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(d: Date | null) {
  if (!d) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  const days = Math.floor(h / 24);
  return `${days} days ago`;
}

export default function DashboardPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid;

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; data: VideoDoc }>>([]);
  const [authors, setAuthors] = useState<Record<string, UserDoc | null>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!currentUser) router.replace("/login");
  }, [loading, currentUser, router]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const unsubPosts = listenCollection<PostDoc>("posts", setPosts, { limit: 25 });
    const unsubEvents = listenCollection<EventDoc>("events", setEvents, {
      orderByField: "dateTime",
      direction: "asc",
      limit: 6,
    });
    const unsubVideos = listenCollection<VideoDoc>("videos", setVideos, {
      orderByField: "addedDate",
      direction: "desc",
      limit: 3,
    });
    return () => {
      unsubPosts?.();
      unsubEvents?.();
      unsubVideos?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const missing = new Set<string>();
    for (const p of posts) {
      const id = p.data.createdBy;
      if (id && !(id in authors)) missing.add(id);
    }
    if (missing.size === 0) return;
    (async () => {
      const entries = await Promise.all(
        Array.from(missing).map(async (id) => [id, await getUser(id)] as const)
      );
      if (cancelled) return;
      setAuthors((prev) => {
        const next = { ...prev };
        for (const [id, doc] of entries) next[id] = doc;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [posts, authors]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(({ data }) => {
      const a = authors[data.createdBy];
      const name = a?.name ?? "";
      return (
        data.title?.toLowerCase().includes(q) ||
        data.body?.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      );
    });
  }, [posts, search, authors]);

  const postsByMe = useMemo(() => {
    if (!uid) return 0;
    return posts.filter((p) => p.data.createdBy === uid).length;
  }, [posts, uid]);

  const isApproved = userDoc?.status === "approved";
  const likesReceived = "—";

  const topContributors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      counts.set(p.data.createdBy, (counts.get(p.data.createdBy) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return sorted.map(([id, count]) => ({
      id,
      count,
      name: authors[id]?.name ?? "Member",
      avatarUrl: authors[id]?.avatarUrl,
    }));
  }, [posts, authors]);

  if (loading) return <p>Loading...</p>;
  if (!currentUser) return null;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!isFirebaseConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase env vars aren’t set yet, so posts/events won’t load. Add{" "}
            <code>NEXT_PUBLIC_FIREBASE_*</code> to <code>.env.local</code>.
          </div>
        )}

        {!isApproved && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Your account is pending admin approval. You can browse the feed, but posting/likes/comments
            are disabled until you’re approved.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-6">
          {/* Left sidebar */}
          <aside className="hidden lg:block space-y-6">
            <Card>
              <CardBody>
                <div className="grid gap-2 text-sm font-semibold text-slate-700">
                  <NavLink href="/dashboard" active>
                    Feed
                  </NavLink>
                  <NavLink href="/members">Community</NavLink>
                  <NavLink href="/events">Events</NavLink>
                  <NavLink href="/videos">Videos</NavLink>
                  <NavLink href="/#programs">Programs</NavLink>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="font-extrabold tracking-tight text-lg flex items-center gap-2">
                  <span className="text-slate-900">Quick Stats</span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Your posts</div>
                    <div className="font-bold text-slate-900">{postsByMe}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Likes received</div>
                    <div className="font-bold text-slate-900">{likesReceived}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Events joined</div>
                    <div className="font-bold text-slate-900">—</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Some stats require aggregation; we’ll wire these next.
                </p>
              </CardBody>
            </Card>
          </aside>

          {/* Center feed */}
          <section className="space-y-6">
            <Card>
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 grid place-items-center text-xs font-bold text-slate-700">
                    You
                  </div>
                  <Link href="/create-post" className="flex-1">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:bg-slate-100 transition">
                      Share your thoughts, photos, or achievements...
                    </div>
                  </Link>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4 flex items-center gap-3 text-sm text-slate-600">
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <span className="text-lg">＋</span> Photo
                  </div>
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <span className="text-lg">🏅</span> Achievement
                  </div>
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <span className="text-lg">♡</span> Feeling
                  </div>
                  <div className="ml-auto hidden sm:block w-64">
                    <Input
                      className="bg-slate-50 border-slate-200"
                      placeholder="Filter feed..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="grid gap-6">
              {filteredPosts.map(({ id, data }) => (
                <PostCard
                  key={id}
                  postId={id}
                  post={data}
                  author={authors[data.createdBy]}
                  uid={uid}
                  canInteract={Boolean(isApproved && isFirebaseConfigured)}
                  isAdmin={userDoc?.role === "admin"}
                />
              ))}
              {filteredPosts.length === 0 && (
                <div className="text-slate-600">No posts found.</div>
              )}
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="hidden lg:block space-y-6">
            <Card>
              <CardHeader>
                <div className="font-extrabold tracking-tight text-lg flex items-center gap-2">
                  <span className="text-slate-900">Upcoming Events</span>
                </div>
              </CardHeader>
              <CardBody>
                {events.length === 0 ? (
                  <div className="text-sm text-slate-600">
                    {isFirebaseConfigured ? "No upcoming events." : "Connect Firebase to load events."}
                  </div>
                ) : (
                  <div className="grid gap-3" id="events">
                    {events.slice(0, 2).map(({ id, data }, idx) => (
                      <div
                        key={id}
                        className={[
                          "rounded-2xl border p-4",
                          idx === 0 ? "border-blue-100 bg-blue-50" : "border-emerald-100 bg-emerald-50",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-14 text-center">
                            <div className={idx === 0 ? "text-blue-700" : "text-emerald-700"}>
                              <div className="text-2xl font-extrabold">
                                {String(new Date(data.dateTime).getDate()).padStart(2, "0")}
                              </div>
                              <div className="text-xs font-bold">JAN</div>
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{data.title}</div>
                            <div className="text-sm text-slate-600 mt-0.5">
                              {new Date(data.dateTime).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link href="/#events">
                      <Button variant="outline" className="w-full">
                        View All Events
                      </Button>
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="font-extrabold tracking-tight text-lg flex items-center gap-2">
                  <span className="text-slate-900">Latest Videos</span>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4">
                  {videos.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      {isFirebaseConfigured ? "No videos yet." : "Connect Firebase to load videos."}
                    </div>
                  ) : (
                    videos.map(({ id, data }) => (
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
                            <div className="text-sm text-slate-500 mt-1 line-clamp-2">{data.description}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/videos">
                    <Button variant="outline" className="w-full">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="font-extrabold tracking-tight text-lg">Top Contributors</div>
              </CardHeader>
              <CardBody>
                {topContributors.length === 0 ? (
                  <div className="text-sm text-slate-600">No contributors yet.</div>
                ) : (
                  <div className="grid gap-3">
                    {topContributors.map((u) => (
                      <div key={u.id} className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 relative">
                          {u.avatarUrl ? (
                            <Image src={u.avatarUrl} alt="" fill className="object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-xs font-bold text-slate-700">
                              {(u.name ?? "M")
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((p) => p[0]?.toUpperCase())
                                .join("")}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500">{u.count} posts</div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Connect
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-2xl px-4 py-3 transition flex items-center gap-3",
        active
          ? "bg-slate-950 text-white"
          : "hover:bg-slate-50 text-slate-800 border border-transparent hover:border-slate-200",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

// (VideoCard placeholder removed; dashboard now uses Firestore videos + iframe embeds)

