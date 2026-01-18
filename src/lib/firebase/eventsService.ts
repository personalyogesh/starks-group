"use client";

/**
 * Events service (adapter)
 * The Figma prompt expects an eventsService with an `events/{eventId}/registrations/{userId}` model.
 * Our app already uses:
 * - events collection: `events/{eventId}`
 * - RSVPs/registrations: `events/{eventId}/rsvps/{uid}` (plus helper functions in `src/lib/firestore.ts`)
 *
 * This file provides a service-style API without changing our underlying schema.
 */

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, isFirebaseConfigured, storage } from "@/lib/firebaseClient";
import {
  createEvent as createEventCore,
  deleteEvent as deleteEventCore,
  getEvent as getEventCore,
  getUser,
  listenEventRsvps,
  registerForEventOptIn,
  unregisterFromEventOptIn,
  EventDoc,
  RsvpDoc,
} from "@/lib/firestore";

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string; // ISO-ish string; mapped from `dateTime`
  location: string;
  type: "tournament" | "training" | "social" | "fundraiser";
  maxParticipants: number;
  registeredCount: number;
  createdAt: any;
  createdBy: string;
}

export interface EventRegistration {
  userId: string;
  eventId: string;
  userName: string;
  userEmail: string;
  registeredAt: any;
}

function mapEvent(id: string, data: EventDoc): Event {
  const type = (data.category ?? "training") as Event["type"];
  return {
    id,
    title: data.title,
    description: data.description ?? "",
    imageUrl: data.bannerImage,
    date: data.dateTime,
    location: data.location,
    type,
    maxParticipants: data.maxParticipants ?? 0,
    registeredCount: data.registrationCount ?? data.registeredUsers?.length ?? 0,
    createdAt: data.createdAt,
    createdBy: data.createdBy,
  };
}

// Create a new event (admin-only via rules)
export async function createEvent(args: {
  userId: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: Event["type"];
  maxParticipants: number;
  imageFile?: File;
}): Promise<string> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");

  let bannerImage: string | undefined;
  if (args.imageFile) {
    const f = args.imageFile;
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `event-images/${Date.now()}.${ext}`;
    const r = ref(storage, path);
    await uploadBytes(r, f, { contentType: f.type || "image/jpeg" });
    bannerImage = await getDownloadURL(r);
  }

  await createEventCore(args.userId, {
    title: args.title,
    dateTime: args.date,
    location: args.location,
    description: args.description,
    bannerImage,
    category: args.type === "fundraiser" ? "social" : args.type,
    maxParticipants: args.maxParticipants,
    registrationCount: 0,
    registeredUsers: [],
    status: "upcoming",
  });

  // createEventCore uses addDoc; no id is returned.
  // If you need the id, we can switch to setDoc with a generated id (similar to posts).
  return "";
}

export async function getUpcomingEvents(opts?: { limit?: number }): Promise<Event[]> {
  const lim = opts?.limit ?? 200;
  const q = query(collection(db, "events"), orderBy("dateTime", "asc"), limit(lim));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapEvent(d.id, d.data() as EventDoc));
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const docData = await getEventCore(eventId);
  if (!docData) return null;
  return mapEvent(eventId, docData);
}

// Optional realtime subscription (handy for UI)
export function subscribeToEventRegistrations(
  eventId: string,
  cb: (rsvps: Array<{ id: string; data: RsvpDoc }>) => void
) {
  return listenEventRsvps(eventId, cb);
}

export async function registerForEvent(eventId: string, userId: string): Promise<void> {
  // Capacity checks are best enforced in Firestore rules or Cloud Functions.
  // Here we do a lightweight check using event doc fields.
  const snap = await getDoc(doc(db, "events", eventId));
  if (!snap.exists()) throw new Error("Event not found");
  const ev = snap.data() as EventDoc;
  const max = ev.maxParticipants ?? null;
  const count = ev.registrationCount ?? ev.registeredUsers?.length ?? 0;
  if (typeof max === "number" && max > 0 && count >= max) throw new Error("Event is full");

  await registerForEventOptIn(eventId, userId);
}

export async function unregisterFromEvent(eventId: string, userId: string): Promise<void> {
  await unregisterFromEventOptIn(eventId, userId);
}

export async function isUserRegisteredForEvent(eventId: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "events", eventId, "rsvps", userId));
  return snap.exists();
}

export async function getUserEventRegistrations(userId: string): Promise<string[]> {
  // Query all rsvps across events using collectionGroup
  const q = query(collectionGroup(db, "rsvps"), where("uid", "==", userId));
  const snap = await getDocs(q);
  const ids = new Set<string>();
  snap.docs.forEach((d) => {
    const eventId = d.ref.parent.parent?.id;
    if (eventId) ids.add(eventId);
  });
  return Array.from(ids);
}

export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  const snap = await getDocs(query(collection(db, "events", eventId, "rsvps"), orderBy("updatedAt", "desc"), limit(500)));
  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as RsvpDoc;
      const uid = d.id;
      const u = await getUser(uid);
      return {
        userId: uid,
        eventId,
        userName: u?.name ?? "Member",
        userEmail: u?.email ?? "",
        registeredAt: data.updatedAt,
      } satisfies EventRegistration;
    })
  );
  return rows;
}

export async function deleteEvent(eventId: string): Promise<void> {
  // Best-effort: unregister all users so their stats/events arrays remain consistent, then delete the event.
  try {
    const rsvpSnap = await getDocs(collection(db, "events", eventId, "rsvps"));
    const uids = rsvpSnap.docs.map((d) => d.id);
    for (const uid of uids) {
      try {
        await unregisterFromEventOptIn(eventId, uid);
      } catch {
        // ignore individual failures
      }
    }
  } catch {
    // ignore
  }

  await deleteEventCore(eventId);
}

