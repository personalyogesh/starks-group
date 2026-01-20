"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import {
  EventDoc,
  PostDoc,
  registerForEventOptIn,
  unregisterFromEventOptIn,
  VideoDoc,
  listenCollection,
} from "@/lib/firestore";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PostCard from "@/components/feed/PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { reportIssue } from "@/lib/reportIssue";
import {
  Award,
  Calendar,
  Home,
  Image as ImageIcon,
  PlusCircle,
  Play,
  TrendingUp,
  User as UserIcon,
  Users,
  Video,
  Youtube,
} from "lucide-react";
import { AuthModal, AuthModalTrigger } from "@/app/components/AuthModal";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";

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
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid ?? null;
  const isApproved = userDoc?.status === "approved" || userDoc?.status === "active";
  const isAdmin = userDoc?.role === "admin";

  const PAGE_SIZE = 10;

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [videos, setVideos] = useState<Array<{ id: string; data: VideoDoc }>>([]);
  const [eventRegistered, setEventRegistered] = useState<Record<string, boolean>>({});

  const [incomingFirstPage, setIncomingFirstPage] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [appliedFirstPage, setAppliedFirstPage] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [olderPosts, setOlderPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const appliedCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const olderCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [search, setSearch] = useState("");
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthModalTrigger>("general");

  const onNavigate = (page: string) => {
    if (page === "landing") return router.push("/");
    if (page === "dashboard") return router.push("/dashboard");
    if (page === "create-post") return router.push("/create-post");
    if (page === "profile" || page === "edit-profile") return router.push("/profile");
    if (page === "settings") return router.push("/settings");
    if (page === "notifications") return router.push("/notifications");
    if (page === "payments") return router.push("/payments");
    if (page === "login") return router.push("/login");
    if (page === "register") return router.push("/register");
    if (page === "members" || page === "community") return router.push("/members");
    if (page === "events") return router.push("/events");
    if (page === "videos") return router.push("/videos");
    if (page === "partners") return router.push("/partners");
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

  // Track registration state for visible sidebar events (cheap: max 6 listeners)
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!uid) {
      setEventRegistered({});
      return;
    }
    const ids = events.map((e) => e.id);
    if (ids.length === 0) return;
    const unsubs = ids.map((eventId) =>
      onSnapshot(
        doc(db, "events", eventId, "rsvps", uid),
        (snap) => {
          setEventRegistered((prev) => ({ ...prev, [eventId]: snap.exists() }));
        },
        () => {
          setEventRegistered((prev) => ({ ...prev, [eventId]: false }));
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [uid, events]);

  // Feed: realtime for first page
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    setPostsError(null);
    // IMPORTANT:
    // - Firestore queries fail if any returned doc is unreadable.
    // Strategy:
    // - admin: query all posts (admins can read everything via rules)
    // - approved member: query only readable privacy values (prevents a single unreadable doc from breaking the whole query)
    // - public/pending: query only public-ish posts
    const canReadAllFeed = Boolean(isApproved || isAdmin);
    const q = canReadAllFeed
      ? query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(PAGE_SIZE))
      : query(collection(db, "posts"), where("privacy", "in", [null, "public"] as any), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    return onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc }));
        // Clear any previous error once we have a successful snapshot.
        setPostsError(null);
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
        setPostsError(
          String((err as any)?.code ? `[${(err as any).code}] ` : "") + String((err as any)?.message ?? "Failed to load posts.")
        );
        // Keep any previously loaded posts on screen; snapshot errors can occur transiently (cache vs server).
      }
    );
  }, [isApproved, isAdmin, PAGE_SIZE, appliedFirstPage.length]);

  const combinedPosts = useMemo(() => {
    const seen = new Set(appliedFirstPage.map((p) => p.id));
    return [...appliedFirstPage, ...olderPosts.filter((p) => !seen.has(p.id))];
  }, [appliedFirstPage, olderPosts]);

  const visiblePosts = useMemo(() => {
    // Reads are public per rules; privacy is a label only.
    return combinedPosts;
  }, [combinedPosts, isApproved, isAdmin]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visiblePosts;
    return visiblePosts.filter(({ data }) => {
      const name = data.authorName ?? "";
      return (
        (data.title ?? "").toLowerCase().includes(q) ||
        (data.body ?? data.content ?? "").toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      );
    });
  }, [visiblePosts, search]);

  const postsThisWeek = useMemo(() => {
    if (!uid) return 0;
    return visiblePosts.filter((p) => p.data.createdBy === uid && withinDays(p.data.createdAt, 7)).length;
  }, [visiblePosts, uid]);

  const connections = userDoc?.stats?.connections ?? 0;
  const eventsJoined = userDoc?.stats?.events ?? 0;

  async function toggleEventRegistration(eventId: string) {
    if (!uid) return requireAuth("event");
    if (!isApproved) {
      toast({
        kind: "error",
        title: "Approval required",
        description: "Your account is pending admin approval. You can browse events, but registration is disabled.",
      });
      return;
    }
    const isReg = Boolean(eventRegistered[eventId]);
    try {
      if (isReg) {
        const ok = window.confirm("Unregister from this event?");
        if (!ok) return;
        await unregisterFromEventOptIn(eventId, uid);
        toast({ kind: "success", title: "Unregistered", description: "You’ve been removed from the event." });
      } else {
        await registerForEventOptIn(eventId, uid);
        toast({ kind: "success", title: "Registered", description: "You’re registered for this event." });
      }
    } catch (err: any) {
      toast({
        kind: "error",
        title: "Event update failed",
        description: err?.message ?? "Failed to update registration. Please try again.",
      });
    }
  }

  async function loadMore() {
    if (!isFirebaseConfigured) return;
    if (!hasMore || loadingMore) return;
    const cursor = olderCursorRef.current ?? appliedCursorRef.current;
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const canReadAllFeed = Boolean(isApproved || isAdmin);
      const q = canReadAllFeed
        ? query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(cursor), limit(PAGE_SIZE))
        : query(
            collection(db, "posts"),
            where("privacy", "in", [null, "public"] as any),
            orderBy("createdAt", "desc"),
            startAfter(cursor),
            limit(PAGE_SIZE)
          );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc }));
      olderCursorRef.current = snap.docs[snap.docs.length - 1] ?? olderCursorRef.current;
      setOlderPosts((prev) => [...prev, ...docs]);
      if (docs.length < PAGE_SIZE) setHasMore(false);
    } catch (err: any) {
      // If any returned document is unreadable, Firestore fails the whole query with permission-denied.
      // Keep already-loaded posts visible and stop pagination to avoid an infinite error loop.
      const code = String(err?.code ?? "");
      if (code === "permission-denied") {
        setHasMore(false);
        toast({
          kind: "error",
          title: "Can’t load older posts",
          description:
            "Some older posts have restricted/legacy privacy settings that your current Firestore rules don’t allow. Deploy the latest Firestore rules or normalize old posts’ privacy fields.",
        });
        return;
      }
      throw err;
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

  if (loading) return <LoadingSpinner message="Loading your dashboard..." />;

  const hasAnyPosts = appliedFirstPage.length > 0 || incomingFirstPage.length > 0 || olderPosts.length > 0;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!isFirebaseConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured in this environment, so posts won’t load. Check your <code>.env.local</code> /
            Vercel env vars.
          </div>
        )}

        {postsError && !hasAnyPosts && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold">Posts couldn’t load.</div>
              <button
                type="button"
                className="text-rose-900/80 underline font-semibold"
                onClick={() =>
                  reportIssue({
                    message: postsError,
                    context: { source: "UserDashboard", feature: "posts" },
                  })
                }
              >
                Report
              </button>
            </div>
            <div className="mt-1">{postsError}</div>
            <div className="mt-2 text-rose-900/80">
              If you recently changed Firestore rules/indexes, deploy them with{" "}
              <code className="font-mono">firebase deploy --only firestore</code>.
            </div>
          </div>
        )}

        {!isApproved && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {currentUser
              ? "Your account is pending admin approval. You can browse the feed, but posting/likes/comments are disabled until you’re approved."
              : "You’re viewing the public community feed. Sign in to interact (like, comment, post, and register for events)."}
          </div>
        )}

        {/* Debug info removed (was used to diagnose Firestore access issues) */}

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-6">
          {/* Left sidebar */}
          <aside className="hidden lg:block space-y-6">
            {/* User Profile Card (only for authenticated users) */}
            {currentUser && (
              <Card>
                <CardBody>
                  <div className="p-6 text-center">
                    <button
                      type="button"
                      onClick={() => onNavigate("profile")}
                      className="group block w-full"
                    >
                      <Avatar className="size-20 mx-auto mb-3 ring-4 ring-slate-100 group-hover:ring-blue-100 transition-all">
                        {userDoc?.avatarUrl || user?.photoURL ? (
                          <AvatarImage
                            src={(userDoc?.avatarUrl || user?.photoURL) as string}
                            alt={userDoc?.name || user?.email || "User"}
                          />
                        ) : (
                          <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                            {(userDoc?.name || user?.email || "U").trim().slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <h3 className="font-semibold text-lg group-hover:text-blue-700 transition-colors">
                        {userDoc?.name || user?.email || "Member"}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">
                        {userDoc?.role === "admin" ? "Administrator" : "Member"}
                      </p>
                    </button>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="text-xl font-extrabold text-blue-700">{userDoc?.stats?.posts ?? 0}</div>
                        <div className="text-xs text-slate-500">Posts</div>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="text-xl font-extrabold text-rose-700">{userDoc?.stats?.likes ?? 0}</div>
                        <div className="text-xs text-slate-500">Likes</div>
                      </div>
                      <div className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                        <div className="text-xl font-extrabold text-emerald-700">{userDoc?.stats?.events ?? 0}</div>
                        <div className="text-xs text-slate-500">Events</div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate("profile")}>
                      <UserIcon className="size-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Navigation Menu */}
            <Card>
              <CardBody>
                <nav className="space-y-1 p-2">
                  <button
                    type="button"
                    onClick={() => onNavigate("dashboard")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition-colors text-left font-semibold bg-blue-50 text-blue-700"
                  >
                    <Home className="size-5" />
                    <span>Feed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate("members")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors text-left text-slate-800 font-semibold"
                  >
                    <Users className="size-5 text-slate-700" />
                    <span>Community</span>
                    <span className="ml-auto rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      2.5K
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate("events")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors text-left text-slate-800 font-semibold"
                  >
                    <Calendar className="size-5 text-slate-700" />
                    <span>Events</span>
                    <span className="ml-auto rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {events.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate("videos")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors text-left text-slate-800 font-semibold"
                  >
                    <Video className="size-5 text-slate-700" />
                    <span>Videos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate("partners")}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-colors text-left text-slate-800 font-semibold"
                  >
                    <Award className="size-5 text-slate-700" />
                    <span>Partners</span>
                  </button>
                </nav>
              </CardBody>
            </Card>

            {/* Quick Stats Card */}
            {currentUser && (
              <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardBody>
                  <div className="p-4">
                    <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                      <TrendingUp className="size-4" />
                      This Week
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Posts created</span>
                        <span className="font-semibold">{postsThisWeek}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Connections</span>
                        <span className="font-semibold">{connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Events joined</span>
                        <span className="font-semibold">{eventsJoined}</span>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Upcoming Events Preview */}
            <Card>
              <CardBody>
                <div className="p-4">
                  <h3 className="font-extrabold mb-3 flex items-center gap-2 text-slate-900">
                    <Calendar className="size-5 text-blue-700" />
                    Upcoming Events
                  </h3>

                  <div className="space-y-3">
                    {events.slice(0, 3).map(({ id, data }) => {
                      const d = data?.dateTime ? new Date(data.dateTime) : null;
                      const month = d && !Number.isNaN(d.getTime())
                        ? d.toLocaleDateString(undefined, { month: "short" }).toUpperCase()
                        : "—";
                      const day = d && !Number.isNaN(d.getTime()) ? String(d.getDate()) : "—";

                      return (
                        <button
                          key={id}
                          type="button"
                          className="group w-full text-left"
                          onClick={() => onNavigate("events")}
                        >
                          <div className="flex gap-3">
                            <div className="size-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center text-white shrink-0">
                              <span className="text-[10px] font-semibold leading-none">{month}</span>
                              <span className="text-lg font-extrabold leading-none">{day}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm group-hover:text-blue-700 transition-colors truncate">
                                {data.title}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">{data.dateTime || "—"}</p>
                              {eventRegistered[id] && (
                                <span className="inline-flex mt-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  ✓ Registered
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => onNavigate("events")}
                  >
                    View All Events →
                  </Button>
                </div>
              </CardBody>
            </Card>
          </aside>

          {/* Center feed */}
          <section className="space-y-6">
            {/* Create Post - Show different based on auth status */}
            {currentUser ? (
              <Card>
                <CardBody>
                  <div className="p-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isApproved) {
                          toast({
                            kind: "error",
                            title: "Approval required",
                            description:
                              "Your account is pending admin approval. Posting is disabled until you’re approved.",
                          });
                          return;
                        }
                        onNavigate("create-post");
                      }}
                      className="w-full text-left px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors flex items-center gap-3"
                    >
                      <Avatar className="size-10">
                        {userDoc?.avatarUrl || user?.photoURL ? (
                          <AvatarImage
                            src={(userDoc?.avatarUrl || user?.photoURL) as string}
                            alt={userDoc?.name || user?.email || "User"}
                          />
                        ) : (
                          <AvatarFallback>
                            {(userDoc?.name || user?.email || "U").trim().slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span>Share your thoughts, photos, or achievements...</span>
                    </button>

                    <div className="flex items-center justify-around mt-4 pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!isApproved) {
                            toast({
                              kind: "error",
                              title: "Approval required",
                              description:
                                "Your account is pending admin approval. Posting is disabled until you’re approved.",
                            });
                            return;
                          }
                          onNavigate("create-post");
                        }}
                        className="flex-1 border-transparent bg-transparent hover:bg-blue-50 hover:text-blue-700 flex flex-col items-center justify-center gap-1 py-3"
                      >
                        <ImageIcon className="size-5" />
                        <span className="text-sm font-semibold leading-tight">Photo</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/videos")}
                        className="flex-1 border-transparent bg-transparent hover:bg-green-50 hover:text-green-700 flex flex-col items-center justify-center gap-1 py-3"
                      >
                        <Video className="size-5" />
                        <span className="text-sm font-semibold leading-tight">Video</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/events")}
                        className="flex-1 border-transparent bg-transparent hover:bg-purple-50 hover:text-purple-700 flex flex-col items-center justify-center gap-1 py-3"
                      >
                        <Calendar className="size-5" />
                        <span className="text-sm font-semibold leading-tight">Event</span>
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardBody>
                  <div className="p-6 text-center">
                    <div className="size-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <PlusCircle className="size-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 mb-2">Join the Conversation</h3>
                    <p className="text-slate-700 mb-4">
                      Sign up to share your cricket journey, connect with players, and participate in events.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => onNavigate("register")}>Create Account</Button>
                      <Button variant="outline" onClick={() => onNavigate("login")}>
                        Login
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Feed search (keep for now; header search does not currently filter this feed) */}
            <div className="hidden sm:block">
              <Input
                className="bg-slate-50 border-slate-200"
                placeholder="Search posts or members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

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
          <aside className="hidden lg:block space-y-4">
            {/* Suggested Connections (for authenticated users) */}
            {currentUser && (
              <Card>
                <CardBody>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-extrabold flex items-center gap-2 text-slate-900">
                        <Users className="size-5 text-blue-700" />
                        Suggested
                      </h3>
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push("/members")}>
                        See all
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          name: "Rajesh Kumar",
                          role: "Fast Bowler",
                          avatar:
                            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
                        },
                        {
                          name: "Priya Singh",
                          role: "All-rounder",
                          avatar:
                            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60",
                        },
                        {
                          name: "Amit Patel",
                          role: "Batsman",
                          avatar:
                            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=60",
                        },
                      ].map((person) => (
                        <div key={person.name} className="flex items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarImage src={person.avatar} alt={person.name} />
                            <AvatarFallback>{person.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-slate-900">{person.name}</p>
                            <p className="text-xs text-slate-500">{person.role}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() =>
                              toast({
                                kind: "info",
                                title: "Coming soon",
                                description: "Following members will be available soon.",
                              })
                            }
                          >
                            Follow
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Latest Videos */}
            <Card>
              <CardBody>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold flex items-center gap-2 text-slate-900">
                      <Youtube className="size-5 text-rose-600" />
                      Latest Videos
                    </h3>
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => router.push("/videos")}>
                      View all
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {videos.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        {isFirebaseConfigured ? "No videos yet." : "Connect Firebase to load videos."}
                      </div>
                    ) : (
                      videos.slice(0, 2).map(({ id, data }) => {
                        const thumb = `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`;
                        const href = `https://www.youtube.com/watch?v=${data.videoId}`;
                        return (
                          <a
                            key={id}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                          >
                            <div className="relative aspect-video bg-slate-200 rounded-xl mb-2 overflow-hidden">
                              {/* Use <img> (not next/image) so we don't depend on remotePatterns */}
                              <img
                                src={thumb}
                                alt={data.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <div className="size-12 bg-rose-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Play className="size-6 text-white ml-1" fill="white" />
                                </div>
                              </div>
                            </div>
                            <p className="text-sm font-semibold group-hover:text-blue-700 transition-colors line-clamp-2 text-slate-900">
                              {data.title}
                            </p>
                            <p className="text-xs text-slate-500">Watch on YouTube</p>
                          </a>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Community Stats */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <CardBody>
                <div className="p-4">
                  <h3 className="font-extrabold mb-3 flex items-center gap-2 text-slate-900">
                    <TrendingUp className="size-5 text-blue-700" />
                    Community
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="size-4 text-blue-700" />
                        </div>
                        <span className="text-sm text-slate-600">Active Members</span>
                      </div>
                      <span className="font-extrabold text-blue-700">2,547</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="size-4 text-emerald-700" />
                        </div>
                        <span className="text-sm text-slate-600">Posts (loaded)</span>
                      </div>
                      <span className="font-extrabold text-emerald-700">{combinedPosts.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="size-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <Calendar className="size-4 text-purple-700" />
                        </div>
                        <span className="text-sm text-slate-600">Events</span>
                      </div>
                      <span className="font-extrabold text-purple-700">{events.length}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Footer Links */}
            <div className="px-4 py-3 text-xs text-slate-500 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Link href="/#about" className="hover:underline">
                  About
                </Link>
                <span>•</span>
                <Link href="/#about" className="hover:underline">
                  Help
                </Link>
                <span>•</span>
                <Link href="/privacy" className="hover:underline">
                  Privacy
                </Link>
                <span>•</span>
                <Link href="/terms" className="hover:underline">
                  Terms
                </Link>
              </div>
              <p className="text-slate-400">© 2026 Starks Cricket Club</p>
            </div>
          </aside>
        </div>
      </div>
      {/* Auth gate for public viewers */}
      <AuthModal open={authGateOpen} onOpenChange={setAuthGateOpen} trigger={authTrigger} />

      {/* Floating Action Button - Mobile Only */}
      {currentUser && (
        <button
          type="button"
          onClick={() => {
            if (!isApproved) {
              toast({
                kind: "error",
                title: "Approval required",
                description: "Your account is pending admin approval. Posting is disabled until you’re approved.",
              });
              return;
            }
            onNavigate("create-post");
          }}
          className="md:hidden fixed bottom-20 right-4 z-40 size-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center"
          aria-label="Create post"
        >
          <PlusCircle className="size-6" />
        </button>
      )}
    </div>
  );
}

// NavLink removed — left sidebar now uses icon-based buttons.

