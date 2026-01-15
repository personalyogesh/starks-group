"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseClient";

export type UserStatus = "pending" | "approved" | "rejected";
export type UserRole = "member" | "admin";

export type UserDoc = {
  name: string;
  email: string;
  phone?: string;
  status: UserStatus;
  role: UserRole;
  requestedAt: any;
};

export type EventDoc = {
  title: string;
  dateTime: string;
  location: string;
  description?: string;
  createdAt: any;
  createdBy: string;
};

export type LinkDoc = {
  title: string;
  url: string;
  createdAt: any;
  createdBy: string;
};

export type PostDoc = {
  title: string;
  body: string;
  imageUrl?: string;
  createdAt: any;
  createdBy: string;
};

export function listenCollection<T>(
  path: string,
  cb: (docs: Array<{ id: string; data: T }>) => void
) {
  const q = query(collection(db, path), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as T })));
  });
}

export async function getUser(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function ensureUserDoc(
  uid: string,
  data: Omit<UserDoc, "requestedAt">
) {
  const ref = doc(db, "users", uid);
  await setDoc(ref, { ...data, requestedAt: serverTimestamp() }, { merge: true });
}

export async function createEvent(
  uid: string,
  data: Omit<EventDoc, "createdAt" | "createdBy">
) {
  await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function deleteEvent(eventId: string) {
  await deleteDoc(doc(db, "events", eventId));
}

export async function createLink(
  uid: string,
  data: Omit<LinkDoc, "createdAt" | "createdBy">
) {
  await addDoc(collection(db, "links"), {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function deleteLink(linkId: string) {
  await deleteDoc(doc(db, "links", linkId));
}

export async function createPost(
  uid: string,
  data: Omit<PostDoc, "createdAt" | "createdBy">
) {
  await addDoc(collection(db, "posts"), {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: uid,
  });
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, "posts", postId));
}

export async function setUserApproval(uid: string, status: UserStatus) {
  await updateDoc(doc(db, "users", uid), { status });
}

export async function setUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, "users", uid), { role });
}

export async function toggleLike(
  postId: string,
  uid: string,
  shouldLike: boolean
) {
  const likeRef = doc(db, "posts", postId, "likes", uid);
  if (shouldLike) {
    await setDoc(likeRef, { createdAt: serverTimestamp() });
  } else {
    await deleteDoc(likeRef);
  }
}

export async function setRsvp(
  eventId: string,
  uid: string,
  status: "going" | "interested"
) {
  const ref = doc(db, "events", eventId, "rsvps", uid);
  await setDoc(ref, { status, updatedAt: serverTimestamp() }, { merge: true });
}

