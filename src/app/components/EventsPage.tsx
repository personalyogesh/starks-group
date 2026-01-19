"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/lib/AuthContext";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import {
  EventDoc,
  listenCollection,
  listenUserRsvps,
  registerForEventOptIn,
  unregisterFromEventOptIn,
} from "@/lib/firestore";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useHydrated } from "@/lib/useHydrated";

type SortMode = "upcoming" | "popular" | "recent";
type Tab = "all" | "mine";
type Category = "" | "tournament" | "training" | "social" | "workshop";

function tsToMs(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.toDate === "function") return ts.toDate().getTime();
  const d = new Date(ts);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function parseDateTime(e: EventDoc): Date | null {
  if (e.dateTime) {
    const d = new Date(e.dateTime);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const ms = tsToMs((e as any).date);
  return ms ? new Date(ms) : null;
}

function fmtDateTime(e: EventDoc, hydrated: boolean) {
  const d = parseDateTime(e);
  // Avoid hydration mismatch: locale formatting can differ between server and client.
  if (!hydrated) return e.dateTime || "—";
  if (!d) return e.dateTime || "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isEnded(e: EventDoc, hydrated: boolean) {
  // Avoid hydration mismatch around time boundaries.
  if (!hydrated) return false;
  const d = parseDateTime(e);
  return Boolean(d && d.getTime() < Date.now());
}

function registrationCount(e: EventDoc) {
  if (typeof e.registrationCount === "number") return e.registrationCount;
  if (Array.isArray(e.registeredUsers)) return e.registeredUsers.length;
  return 0;
}

export default function EventsPage() {
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const hydrated = useHydrated();

  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid ?? "";
  const isApproved = userDoc?.status === "approved" || userDoc?.status === "active";

  const [tab, setTab] = useState<Tab>("all");
  const [category, setCategory] = useState<Category>("");
  const [sort, setSort] = useState<SortMode>("upcoming");
  const [search, setSearch] = useState("");

  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);
  const [myEventIds, setMyEventIds] = useState<Set<string>>(new Set());

  // confirm modal state
  const [confirm, setConfirm] = useState<{
    open: boolean;
    mode: "register" | "unregister";
    eventId: string;
    title: string;
  }>({ open: false, mode: "register", eventId: "", title: "" });
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<EventDoc>("events", setEvents, {
      orderByField: "dateTime",
      direction: "asc",
      limit: 200,
      onError: (err) => {
        console.warn("[EventsPage] events listener error", err);
        setEvents([]);
      },
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    if (!uid) return;
    return listenUserRsvps(
      uid,
      (docs) => {
        setMyEventIds(new Set(docs.map((d) => d.eventId).filter(Boolean)));
      },
      {
        onError: (err) => {
          console.warn("[EventsPage] my RSVPs listener error", err);
          setMyEventIds(new Set());
        },
      }
    );
  }, [uid]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = events.slice();

    if (category) {
      list = list.filter((e) => (e.data.category ?? "") === category);
    }

    if (q) {
      list = list.filter((e) => {
        const t = (e.data.title ?? "").toLowerCase();
        const loc = (e.data.location ?? "").toLowerCase();
        return t.includes(q) || loc.includes(q);
      });
    }

    if (tab === "mine") {
      list = list.filter((e) => myEventIds.has(e.id));
    }

    if (sort === "popular") {
      list.sort((a, b) => registrationCount(b.data) - registrationCount(a.data));
    } else if (sort === "recent") {
      list.sort((a, b) => (tsToMs(b.data.createdAt) ?? 0) - (tsToMs(a.data.createdAt) ?? 0));
    } else {
      // upcoming: earliest first
      list.sort((a, b) => {
        const ad = parseDateTime(a.data)?.getTime() ?? 0;
        const bd = parseDateTime(b.data)?.getTime() ?? 0;
        return ad - bd;
      });
    }

    return list;
  }, [events, category, search, tab, myEventIds, sort]);

  const upcoming = useMemo(() => visible.filter((e) => !isEnded(e.data, hydrated)), [visible, hydrated]);
  const past = useMemo(() => visible.filter((e) => isEnded(e.data, hydrated)), [visible, hydrated]);

  const canInteract = Boolean(isApproved && isFirebaseConfigured && uid);

  function openConfirm(mode: "register" | "unregister", eventId: string, title: string) {
    setConfirm({ open: true, mode, eventId, title });
  }

  async function doConfirm() {
    if (!confirm.eventId) return;
    if (!uid) {
      toast({ kind: "error", title: "Login required", description: "Please login to register for events." });
      setConfirm((p) => ({ ...p, open: false }));
      return;
    }
    if (!isApproved) {
      toast({ kind: "error", title: "Approval required", description: "Your account is pending admin approval." });
      setConfirm((p) => ({ ...p, open: false }));
      return;
    }
    setActing(true);
    try {
      if (confirm.mode === "register") {
        await registerForEventOptIn(confirm.eventId, uid);
        toast({ kind: "success", title: "Registered", description: "Successfully registered!" });
      } else {
        await unregisterFromEventOptIn(confirm.eventId, uid);
        toast({ kind: "success", title: "Unregistered", description: "You have been unregistered." });
      }
    } catch (e: any) {
      toast({ kind: "error", title: "Action failed", description: e?.message ?? "Failed to register. Try again." });
    } finally {
      setActing(false);
      setConfirm((p) => ({ ...p, open: false }));
    }
  }

  if (loading) return <LoadingSpinner message="Loading events..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Events</h1>
          <p className="text-slate-600 mt-1">Browse upcoming events and opt in to register.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTab("all")} disabled={tab === "all"}>
            All Events
          </Button>
          <Button variant="outline" onClick={() => setTab("mine")} disabled={tab === "mine"}>
            My Events
          </Button>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-3 items-center">
            <Input
              className="bg-slate-100 border-slate-100"
              placeholder="Search events by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select className="bg-white" value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="">All Categories</option>
              <option value="tournament">Tournaments</option>
              <option value="training">Training</option>
              <option value="social">Social</option>
              <option value="workshop">Workshops</option>
            </Select>

            <Select className="bg-white" value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="upcoming">Upcoming</option>
              <option value="popular">Most Popular</option>
              <option value="recent">Recently Added</option>
            </Select>
          </div>
        </CardBody>
      </Card>

      {!isFirebaseConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Firebase isn’t configured yet, so events won’t load. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to <code>.env.local</code>.
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-950">Upcoming Events</h2>
          <Link className="text-sm font-semibold text-slate-700 hover:text-slate-900" href="/dashboard">
            Back to dashboard →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-slate-600">No upcoming events.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map(({ id, data }) => (
              <EventCard
                key={id}
                id={id}
                data={data}
                hydrated={hydrated}
                registered={myEventIds.has(id)}
                canInteract={canInteract}
                onRegister={() => openConfirm("register", id, data.title)}
                onUnregister={() => openConfirm("unregister", id, data.title)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-950">Past Events</h2>
        {past.length === 0 ? (
          <div className="text-slate-600">No past events.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {past.slice(0, 8).map(({ id, data }) => (
              <EventCard
                key={id}
                id={id}
                data={data}
                hydrated={hydrated}
                registered={myEventIds.has(id)}
                canInteract={false}
                onRegister={() => {}}
                onUnregister={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={confirm.open}
        title={confirm.mode === "register" ? "Register for event" : "Unregister from event"}
        onClose={() => !acting && setConfirm((p) => ({ ...p, open: false }))}
        maxWidthClassName="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" disabled={acting} onClick={() => setConfirm((p) => ({ ...p, open: false }))}>
              Cancel
            </Button>
            <Button variant="dark" disabled={acting} onClick={doConfirm}>
              {acting ? "Working..." : "Confirm"}
            </Button>
          </div>
        }
      >
        <div className="text-slate-700">
          {confirm.mode === "register" ? (
            <p>
              Register for <span className="font-extrabold">{confirm.title}</span>?
            </p>
          ) : (
            <p>
              Unregister from <span className="font-extrabold">{confirm.title}</span>?
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function EventCard({
  id,
  data,
  hydrated,
  registered,
  canInteract,
  onRegister,
  onUnregister,
}: {
  id: string;
  data: EventDoc;
  hydrated: boolean;
  registered: boolean;
  canInteract: boolean;
  onRegister: () => void;
  onUnregister: () => void;
}) {
  const ended = isEnded(data, hydrated);
  const count = registrationCount(data);
  const max = data.maxParticipants ?? null;
  const full = typeof max === "number" && max > 0 && count >= max;

  const category = data.category ?? "training";
  const catLabel =
    category === "tournament"
      ? "Tournament"
      : category === "social"
      ? "Social"
      : category === "workshop"
      ? "Workshop"
      : "Training";

  return (
    <Card>
      <CardBody>
        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
          <div className="relative aspect-[16/8] bg-slate-200">
            {data.bannerImage ? (
              <Image src={data.bannerImage} alt="" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/90 border border-white/40 px-3 py-1 text-xs font-bold text-slate-900">
                {catLabel}
              </span>
              {full && (
                <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700">
                  Full
                </span>
              )}
              {ended && (
                <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                  Ended
                </span>
              )}
              {registered && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                  You&apos;re registered
                </span>
              )}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-slate-950">{data.title}</div>
                <div className="mt-1 text-sm text-slate-600">{fmtDateTime(data, hydrated)}</div>
                <div className="mt-1 text-sm text-slate-600">📍 {data.location}</div>
              </div>
              <div className="text-sm font-semibold text-slate-700">{count} registered</div>
            </div>

            {data.description && <div className="mt-3 text-sm text-slate-700">{data.description}</div>}

            <div className="mt-4 flex items-center justify-end gap-2">
              {registered ? (
                <Button
                  variant="outline"
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  disabled={!canInteract || ended}
                  onClick={onUnregister}
                  title={!canInteract ? "Approval required" : ended ? "Registration closed" : undefined}
                >
                  Registered ✓
                </Button>
              ) : (
                <Button
                  variant="dark"
                  disabled={!canInteract || ended || full}
                  onClick={onRegister}
                  title={
                    !canInteract ? "Approval required" : ended ? "Registration closed" : full ? "Event is full" : undefined
                  }
                >
                  Register for Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

