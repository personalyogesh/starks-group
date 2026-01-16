"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { useAuth } from "@/lib/AuthContext";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import {
  clearRsvp,
  createEvent,
  deleteEvent,
  EventDoc,
  getUser,
  listenCollection,
  listenEventRsvpCount,
  listenEventRsvps,
  RsvpDoc,
  setRsvp,
  updateEvent,
  UserDoc,
} from "@/lib/firestore";
import { useToast } from "@/components/ui/ToastProvider";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateTime(s: string) {
  const d = parseDate(s);
  if (!d) return s || "—";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function isPast(dt: string) {
  const d = parseDate(dt);
  if (!d) return false;
  return d.getTime() < Date.now();
}

export default function EventsPage() {
  const { toast } = useToast();
  const { currentUser, loading } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid ?? "";

  const isAdmin = userDoc?.role === "admin";
  const isApproved = userDoc?.status === "approved";

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);

  // modal state
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [attendees, setAttendees] = useState<Array<{ uid: string; data: UserDoc | null }>>([]);
  const [rsvps, setRsvps] = useState<Array<{ id: string; data: RsvpDoc }>>([]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<EventDoc>("events", setEvents, {
      orderByField: "dateTime",
      direction: "asc",
      limit: 200,
    });
  }, []);

  const filtered = useMemo(() => {
    const list = events.slice();
    if (tab === "upcoming") return list.filter((e) => !isPast(e.data.dateTime));
    return list.filter((e) => isPast(e.data.dateTime)).reverse();
  }, [events, tab]);

  function openCreate() {
    setEditingId(null);
    setTitle("");
    setDateTime("");
    setLocation("");
    setDescription("");
    setAttendees([]);
    setRsvps([]);
    setOpen(true);
  }

  async function openEdit(id: string, data: EventDoc) {
    setEditingId(id);
    setTitle(data.title ?? "");
    setDateTime(data.dateTime ?? "");
    setLocation(data.location ?? "");
    setDescription(data.description ?? "");
    setOpen(true);
  }

  useEffect(() => {
    if (!open || !editingId || !isFirebaseConfigured) return;
    return listenEventRsvps(editingId, setRsvps);
  }, [open, editingId]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !editingId) return;
    const uids = rsvps.map((r) => r.id).filter(Boolean);
    if (uids.length === 0) {
      setAttendees([]);
      return;
    }
    (async () => {
      const entries = await Promise.all(uids.map(async (u) => ({ uid: u, data: await getUser(u) })));
      if (cancelled) return;
      setAttendees(entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, editingId, rsvps]);

  async function saveEvent() {
    if (!user) return;
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Firebase not configured" });
      return;
    }
    if (!title.trim() || !dateTime || !location.trim()) {
      toast({ kind: "error", title: "Missing fields", description: "Title, date/time, and location are required." });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateEvent(editingId, {
          title: title.trim(),
          dateTime,
          location: location.trim(),
          description: description.trim() || undefined,
        });
        toast({ kind: "success", title: "Event updated" });
      } else {
        await createEvent(user.uid, {
          title: title.trim(),
          dateTime,
          location: location.trim(),
          description: description.trim() || undefined,
        });
        toast({ kind: "success", title: "Event created" });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ kind: "error", title: "Save failed", description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Events</h1>
          <p className="text-slate-600 mt-1">Upcoming matches, practices, and community meetups.</p>
        </div>
        {isAdmin && (
          <Button variant="dark" type="button" onClick={openCreate} disabled={!isFirebaseConfigured}>
            ➕ Create Event
          </Button>
        )}
      </div>

      {!isFirebaseConfigured && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to <code>.env.local</code>.
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant={tab === "upcoming" ? "dark" : "outline"} type="button" onClick={() => setTab("upcoming")}>
          Upcoming
        </Button>
        <Button variant={tab === "past" ? "dark" : "outline"} type="button" onClick={() => setTab("past")}>
          Past
        </Button>
      </div>

      <div className="grid gap-6">
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-slate-700">{tab === "upcoming" ? "No upcoming events." : "No past events."}</p>
            </CardBody>
          </Card>
        ) : (
          filtered.map(({ id, data }) => (
            <EventCard
              key={id}
              id={id}
              event={data}
              uid={uid}
              canRegister={Boolean(user && isApproved && !userDoc?.suspended)}
              isAdmin={Boolean(isAdmin)}
              onEdit={() => openEdit(id, data)}
              onDelete={async () => {
                if (!isFirebaseConfigured) return;
                const ok = window.confirm("Delete this event?");
                if (!ok) return;
                await deleteEvent(id);
                toast({ kind: "success", title: "Event deleted" });
              }}
            />
          ))
        )}
      </div>

      <Modal
        open={open}
        title={editingId ? "Edit Event" : "Create Event"}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="dark" type="button" onClick={saveEvent} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-semibold">Title</label>
            <Input className="bg-slate-100 border-slate-100" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold">Date & time</label>
            <Input
              type="datetime-local"
              className="bg-slate-100 border-slate-100"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold">Location</label>
            <Input className="bg-slate-100 border-slate-100" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold">Description (optional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bring whites, water, and a cap."
            />
          </div>

          {editingId && (
            <Card>
              <CardHeader>
                <div className="font-bold">Registered attendees</div>
                <div className="text-sm text-slate-600 mt-1">Users who RSVP’d.</div>
              </CardHeader>
              <CardBody>
                {rsvps.length === 0 ? (
                  <div className="text-sm text-slate-600">No RSVPs yet.</div>
                ) : (
                  <div className="grid gap-2 max-h-64 overflow-auto">
                    {attendees.map((a) => (
                      <div key={a.uid} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">{a.data?.name ?? a.uid}</div>
                          <div className="text-xs text-slate-500 truncate">{a.data?.email ?? ""}</div>
                        </div>
                        <div className="text-xs text-slate-500">{rsvps.find((r) => r.id === a.uid)?.data.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </Modal>
    </div>
  );
}

function EventCard({
  id,
  event,
  uid,
  canRegister,
  isAdmin,
  onEdit,
  onDelete,
}: {
  id: string;
  event: EventDoc;
  uid: string;
  canRegister: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [count, setCount] = useState(0);
  const [myStatus, setMyStatus] = useState<null | "going" | "interested">(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenEventRsvpCount(id, setCount);
  }, [id]);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    const ref = doc(db, "events", id, "rsvps", uid);
    return onSnapshot(ref, (snap) => {
      if (!snap.exists()) setMyStatus(null);
      else setMyStatus((snap.data() as any)?.status ?? "going");
    });
  }, [id, uid]);

  async function register() {
    if (!canRegister) return;
    if (!isFirebaseConfigured || !uid) return;
    setBusy(true);
    try {
      await setRsvp(id, uid, "going");
      toast({ kind: "success", title: "Registered" });
    } catch (e: any) {
      toast({ kind: "error", title: "Registration failed", description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  async function unregister() {
    if (!canRegister) return;
    if (!isFirebaseConfigured || !uid) return;
    setBusy(true);
    try {
      await clearRsvp(id, uid);
      toast({ kind: "success", title: "Registration removed" });
    } catch (e: any) {
      toast({ kind: "error", title: "Update failed", description: e?.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-950">{event.title}</div>
            <div className="text-sm text-slate-600 mt-1">
              {fmtDateTime(event.dateTime)} · {event.location}
            </div>
          </div>
          <div className="text-sm text-slate-600">
            <b>{count}</b> attending
          </div>
        </div>
      </CardHeader>
      <CardBody>
        {event.description && <p className="text-slate-800 whitespace-pre-wrap">{event.description}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {myStatus ? (
              <span>
                Status: <b className="text-slate-900">{myStatus}</b>
              </span>
            ) : (
              <span>Status: —</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button variant="outline" type="button" onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="outline" type="button" onClick={onDelete}>
                  Delete
                </Button>
              </>
            )}

            {!myStatus ? (
              <Button variant="dark" type="button" disabled={!canRegister || busy} onClick={register}>
                {busy ? "..." : "Register"}
              </Button>
            ) : (
              <Button variant="outline" type="button" disabled={!canRegister || busy} onClick={unregister}>
                {busy ? "..." : "Registered"}
              </Button>
            )}
          </div>
        </div>
        {!canRegister && (
          <div className="mt-3 text-xs text-slate-500">
            You must be an approved, non-suspended member to register for events.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

