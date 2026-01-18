"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import { EventDoc, getUser, PostDoc, UserDoc, VideoDoc, listenCollection } from "@/lib/firestore";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PostCard from "@/components/feed/PostCard";
import { UserAccountMenu } from "@/app/components/UserAccountMenu";
import { Bell, PlusCircle } from "lucide-react";
import { AuthModal, AuthModalTrigger } from "@/app/components/AuthModal";

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function withinDays(ts: any, days: number) {
  const d = tsToDate(ts);
  if (!d) return false;
  return Date.now() - d.getTime() <= days * 24 * 60 * 60 * 1000;
}

export default function UserDashboard() {
  const { currentUser, loading, logout } = useAuth();
  const router = useRouter();

  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid ?? null;
  const isApproved = userDoc?.status === "approved";
  const isAdmin = userDoc?.role === "admin";

  const PAGE_SIZE = 10;

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; data: VideoDoc }>>([]);

  const [incomingFirstPage, setIncomingFirstPage] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [appliedFirstPage, setAppliedFirstPage] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [olderPosts, setOlderPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const appliedCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const olderCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [authors, setAuthors] = useState<Record<string, UserDoc | null>>({});
  const [search, setSearch] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthModalTrigger>("general");

  const onNavigate = (page: string) => {
    if (page === "landing") return router.push("/");
    if (page === "create-post") return router.push("/create-post");
    if (page === "profile" || page === "edit-profile" || page === "settings") return router.push("/profile");
    if (page === "notifications") return router.push("/dashboard");
    if (page === "help") return router.push("/#about");
    if (page === "admin" && isAdmin) return router.push("/admin");
  };

  const requireAuth = (trigger: AuthModalTrigger) => {
    setAuthTrigger(trigger);
    setAuthGateOpen(true);
  };

  useEffect(() => {
    // Dashboard is public-read: do not redirect to login.
    if (loading) return;
  }, [loading, currentUser, router]);

  // Right sidebar listeners
  useEffect(() => {
    if (!isFirebaseConfigured) return;
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
      unsubEvents?.();
      unsubVideos?.();
    };
  }, []);

  // Feed: realtime for first page
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    return onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc }));
        setIncomingFirstPage(docs);
        appliedCursorRef.current = snap.docs[snap.docs.length - 1] ?? null;
        if (appliedFirstPage.length === 0) {
          setAppliedFirstPage(docs);
          setHasNewPosts(false);
        } else if (docs[0]?.id && docs[0].id !== appliedFirstPage[0]?.id) {
          setHasNewPosts(true);
        }
      },
      (err) => {
        console.warn("[UserDashboard] posts listener error", { err });
        setIncomingFirstPage([]);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinedPosts = useMemo(() => {
    const seen = new Set(appliedFirstPage.map((p) => p.id));
    return [...appliedFirstPage, ...olderPosts.filter((p) => !seen.has(p.id))];
  }, [appliedFirstPage, olderPosts]);

  const visiblePosts = useMemo(() => {
    const approved = Boolean(isApproved);
    return combinedPosts.filter(({ data }) => {
      const p = (data.privacy ?? "public") as string;
      if (!p || p === "public") return true;
      if (p === "members" || p === "friends") return approved;
      return true;
    });
  }, [combinedPosts, isApproved]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visiblePosts;
    return visiblePosts.filter(({ data }) => {
      const a = authors[data.createdBy];
      const name = a?.name ?? data.authorName ?? "";
      return (
        (data.title ?? "").toLowerCase().includes(q) ||
        (data.body ?? data.content ?? "").toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      );
    });
  }, [visiblePosts, search, authors]);

  // Fetch missing authors
  useEffect(() => {
    let cancelled = false;
    const missing = new Set<string>();
    for (const p of visiblePosts) {
      const id = p.data.createdBy;
      if (id && !(id in authors)) missing.add(id);
    }
    if (!isFirebaseConfigured || missing.size === 0) return;
    (async () => {
      const entries = await Promise.all(Array.from(missing).map(async (id) => [id, await getUser(id)] as const));
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
  }, [visiblePosts, authors]);

  const postsThisWeek = useMemo(() => {
    if (!uid) return 0;
    return visiblePosts.filter((p) => p.data.createdBy === uid && withinDays(p.data.createdAt, 7)).length;
  }, [visiblePosts, uid]);

  const connections = userDoc?.stats?.connections ?? 0;
  const eventsJoined = userDoc?.stats?.events ?? 0;

  async function loadMore() {
    if (!isFirebaseConfigured) return;
    if (!hasMore || loadingMore) return;
    const cursor = olderCursorRef.current ?? appliedCursorRef.current;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc }));
      olderCursorRef.current = snap.docs[snap.docs.length - 1] ?? olderCursorRef.current;
      setOlderPosts((prev) => [...prev, ...docs]);
      if (docs.length < PAGE_SIZE) setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  function applyNewPosts() {
    setAppliedFirstPage(incomingFirstPage);
    setHasNewPosts(false);
    setOlderPosts((prev) => {
      const ids = new Set(incomingFirstPage.map((p) => p.id));
      return prev.filter((p) => !ids.has(p.id));
    });
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!isApproved && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {currentUser
              ? "Your account is pending admin approval. You can browse the feed, but posting/likes/comments are disabled until you’re approved."
              : "You’re viewing the public community feed. Sign in to interact (like, comment, post, and register for events)."}
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
                    <div className="text-slate-600">Posts this week</div>
                    <div className="font-bold text-slate-900">{postsThisWeek}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Connections</div>
                    <div className="font-bold text-slate-900">{connections}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-600">Events joined</div>
                    <div className="font-bold text-slate-900">{eventsJoined}</div>
                  </div>
                </div>
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
                  {currentUser ? (
                    <Link href="/create-post" className="flex-1">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:bg-slate-100 transition">
                        Share your thoughts, photos, or achievements...
                      </div>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="flex-1 text-left rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:bg-slate-100 transition"
                      onClick={() => setAuthGateOpen(true)}
                    >
                      Share your thoughts, photos, or achievements...
                    </button>
                  )}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-4 flex items-center gap-3 text-sm text-slate-600">
                  <div className="hidden sm:block w-72">
                    <Input
                      className="bg-slate-50 border-slate-200"
                      placeholder="Search posts or members..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    {/* Notifications Button */}
                    <button
                      type="button"
                      className="relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center"
                      aria-label="Notifications"
                      onClick={() => onNavigate("notifications")}
                    >
                      <Bell className="size-5 text-slate-700" />
                      <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Create Post Button */}
                    <Button
                      variant="dark"
                      className="hidden sm:inline-flex items-center"
                      onClick={() => (currentUser ? onNavigate("create-post") : requireAuth("post"))}
                    >
                      <PlusCircle className="size-4 mr-2" />
                      Create Post
                    </Button>

                    {/* User Account Menu */}
                    <UserAccountMenu
                      user={{
                        name:
                          userDoc?.name ||
                          `${userDoc?.firstName ?? ""} ${userDoc?.lastName ?? ""}`.trim() ||
                          user?.email ||
                          "Account",
                        email: user?.email ?? "",
                        avatar: userDoc?.avatarUrl,
                        role: userDoc?.joinAs ?? userDoc?.role,
                      }}
                      notificationCount={5}
                      onNavigate={onNavigate}
                      onLogout={async () => {
                        await logout();
                        onNavigate("landing");
                      }}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            {hasNewPosts && (
              <button
                type="button"
                className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 hover:bg-blue-100 transition"
                onClick={applyNewPosts}
              >
                New posts available — click to refresh
              </button>
            )}

            <div className="grid gap-6">
              {filteredPosts.map(({ id, data }) => (
                <PostCard
                  key={id}
                  postId={id}
                  post={data}
                  author={authors[data.createdBy]}
                  uid={uid}
                  canInteract={Boolean(isApproved && isFirebaseConfigured)}
                  isAdmin={isAdmin}
                />
              ))}
              {filteredPosts.length === 0 && <div className="text-slate-600">No posts found.</div>}
            </div>

            {hasMore && (
              <div className="pt-2">
                <Button variant="outline" className="w-full" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
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
                            <div className="text-sm text-slate-600 mt-0.5">{new Date(data.dateTime).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link href="/events">
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
                          {data.description && <div className="text-sm text-slate-500 mt-1 line-clamp-2">{data.description}</div>}
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
                <div className="font-extrabold tracking-tight text-lg">Suggested Connections</div>
              </CardHeader>
              <CardBody>
                <div className="text-sm text-slate-600">
                  Coming soon — we’ll suggest members based on shared interests and activity.
                </div>
              </CardBody>
            </Card>
          </aside>
        </div>
      </div>
      {/* Auth gate for public viewers */}
      <AuthModal open={authGateOpen} onOpenChange={setAuthGateOpen} trigger={authTrigger} />
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

