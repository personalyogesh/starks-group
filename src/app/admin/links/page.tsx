"use client";

import { RequireAdmin } from "@/components/RequireAdmin";
import { useAuth } from "@/components/AuthProvider";
import { listenCollection, createEvent, deleteEvent, EventDoc } from "@/lib/firestore";
import { useEffect, useState } from "react";

export default function AdminEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Array<{ id: string; data: EventDoc }>>([]);

  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => listenCollection<EventDoc>("events", setEvents), []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    await createEvent(user.uid, { title, dateTime, location, description });
    setTitle(""); setDateTime(""); setLocation(""); setDescription("");
  }

  return (
    <RequireAdmin>
      <h1>Manage Events</h1>

      <form onSubmit={add} style={{ display: "grid", gap: 10, maxWidth: 640, marginTop: 10 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input placeholder="Date/Time (example: 2026-02-01T10:00:00)" value={dateTime} onChange={(e) => setDateTime(e.target.value)} required />
        <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} required />
        <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit">Add Event</button>
      </form>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {events.map(({ id, data }) => (
          <div key={id} style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>{data.title}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{data.dateTime} • {data.location}</div>
            <button style={{ marginTop: 10 }} onClick={() => deleteEvent(id)}>Delete</button>
          </div>
        ))}
      </div>
    </RequireAdmin>
  );
}
