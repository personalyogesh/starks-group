"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/lib/AuthContext";
import { listenCollection, createEvent, deleteEvent, EventDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebaseClient";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdminEventsPage() {
  const { currentUser } = useAuth();
  const user = currentUser?.authUser ?? null;
  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);

  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenCollection<EventDoc>("events", setEvents);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !isFirebaseConfigured) return;
    await createEvent(user.uid, { title, dateTime, location, description });
    setTitle("");
    setDateTime("");
    setLocation("");
    setDescription("");
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Manage Events</h1>
          <p className="text-slate-600 mt-1">Create matches, practices, and meetups.</p>
        </div>

        {!isFirebaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Firebase isn’t configured yet. Add <code>NEXT_PUBLIC_FIREBASE_*</code> to{" "}
            <code>.env.local</code>.
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="font-bold">New event</div>
            <div className="text-sm text-slate-600 mt-1">
              Tip: use ISO format or the datetime picker below.
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={add} className="grid gap-4 max-w-2xl">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Title</label>
                <Input
                  placeholder="Practice @ Central Park"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Date & time</label>
                <Input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500">
                  Stored as a string for now; we’ll upgrade to Firestore Timestamp later.
                </p>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Location</label>
                <Input
                  placeholder="Cunningham Park"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold">Description (optional)</label>
                <textarea
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
                  placeholder="Bring whites, water, and a cap."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button disabled={!isFirebaseConfigured} type="submit">
                  Add event
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold">Upcoming</div>
            <div className="text-sm text-slate-600 mt-1">Your current events in the feed.</div>
          </CardHeader>
          <CardBody>
            {events.length === 0 ? (
              <p className="text-slate-600">
                {isFirebaseConfigured ? "No events yet." : "Connect Firebase to load events."}
              </p>
            ) : (
              <div className="grid gap-3">
                {events.map(({ id, data }) => (
                  <div
                    key={id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="font-semibold">{data.title}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {data.dateTime} · {data.location}
                      </div>
                      {data.description && (
                        <p className="text-sm text-slate-700 mt-2">{data.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => deleteEvent(id)}
                      disabled={!isFirebaseConfigured}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAdmin>
  );
}

