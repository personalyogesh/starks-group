"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import { EventDoc, PostDoc } from "@/lib/firestore";

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function MembersPage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const isAdmin = currentUser?.userDoc?.role === "admin";
  const isApproved = userDoc?.status === "approved" || userDoc?.status === "active";

  const [approvedCount, setApprovedCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [posts, setPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    if (!isAdmin || !isFirebaseConfigured) return;
    let cancelled = false;
    (async () => {
      setLoadingCount(true);
      try {
        // Rules treat both `approved` and legacy `active` as approved members.
        const [approvedSnap, activeSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("status", "==", "approved"))),
          getDocs(query(collection(db, "users"), where("status", "==", "active"))),
        ]);
        if (!cancelled) {
          setApprovedCount(approvedSnap.size + activeSnap.size);
        }
      } catch {
        if (!cancelled) setApprovedCount(null);
      } finally {
        if (!cancelled) setLoadingCount(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    (async () => {
      setLoadingFeed(true);
      try {
        const [postsSnap, eventsSnap] = await Promise.all([
          getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(5))),
          getDocs(query(collection(db, "events"), orderBy("dateTime", "asc"), limit(8))),
        ]);
        if (!cancelled) {
          setPosts(postsSnap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc })));
          setEvents(eventsSnap.docs.map((d) => ({ id: d.id, data: d.data() as EventDoc })));
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoadingFeed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events
      .filter(({ data }) => {
        const d = toDate((data as any)?.dateTime ?? (data as any)?.date);
        return Boolean(d && d.getTime() >= now);
      })
      .slice(0, 3);
  }, [events]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="text-2xl font-extrabold tracking-tight">Community Hub</div>
          <div className="text-sm text-slate-600 mt-1">
            Discover live updates, upcoming events, and where to jump in next.
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Link href="/community">
              <Button>Explore Community Feed</Button>
            </Link>
            <Link href="/events">
              <Button variant="outline">View Events</Button>
            </Link>
            {!user ? (
              <>
                <Link href="/register">
                  <Button variant="outline">Join as Member</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
              </>
            ) : isApproved ? (
              <Link href="/create-post">
                <Button variant="outline">Create Post</Button>
              </Link>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="font-bold">Recent Posts</div>
          </CardHeader>
          <CardBody>
            {loadingFeed ? (
              <p className="text-slate-600">Loading…</p>
            ) : posts.length === 0 ? (
              <p className="text-slate-600">No posts yet.</p>
            ) : (
              <div className="space-y-3">
                {posts.slice(0, 3).map(({ id, data }) => (
                  <Link key={id} href="/community" className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                    <div className="font-semibold text-slate-900 truncate">{data.title || "Community Update"}</div>
                    <div className="text-sm text-slate-600 line-clamp-2 mt-1">{data.body || data.content || "Open community to view full post."}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold">Upcoming Events</div>
          </CardHeader>
          <CardBody>
            {loadingFeed ? (
              <p className="text-slate-600">Loading…</p>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-slate-600">No upcoming events.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(({ id, data }) => (
                  <Link key={id} href="/events" className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                    <div className="font-semibold text-slate-900">{data.title}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {toDate((data as any)?.dateTime ?? (data as any)?.date)?.toLocaleString() || data.dateTime || "Date TBD"}
                      {" · "}
                      {data.location || "Location TBD"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="font-bold">Privacy</div>
        </CardHeader>
        <CardBody>
          {isAdmin ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600">Approved members</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1">
                  {loadingCount ? "…" : approvedCount ?? "—"}
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Manage member details in the{" "}
                <Link href="/admin/users" className="font-semibold text-blue-700 hover:underline">
                  Admin Users
                </Link>{" "}
                area.
              </p>
            </div>
          ) : (
            <p className="text-slate-700">
              Member directory details are restricted to protect privacy. Community participation happens via posts and events.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

