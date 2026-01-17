"use client";

import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  where,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "./firebaseClient";

export type UserStatus = "pending" | "approved" | "rejected";
export type UserRole = "member" | "admin";

export type UserDoc = {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  lastLoginAt?: any;
  suspended?: boolean;
  sportInterest?: string;
  joinAs?: string;
  agreedToTerms?: boolean;
  wantsUpdates?: boolean;
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

export type RsvpDoc = {
  uid?: string;
  status: "going" | "interested";
  updatedAt: any;
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
  commentCount?: number;
  createdAt: any;
  createdBy: string;
};

export type CommentDoc = {
  postId?: string;
  body: string;
  createdAt: any;
  createdBy: string;
  // client-only
  _source?: "top" | "sub";
};

export type VideoDoc = {
  videoId: string;
  title: string;
  description?: string;
  addedBy: string;
  addedDate: any;
};

export type CarouselSlideDoc = {
  title: string;
  note?: string;
  imageUrl: string;
  storagePath?: string;
  createdAt: any;
  createdBy: string;
};

export function listenCollection<T>(
  path: string,
  cb: (docs: Array<{ id: string; data: T }>) => void,
  opts?: {
    orderByField?: string;
    direction?: "asc" | "desc";
    limit?: number;
    onError?: (err: unknown) => void;
  }
) {
  const orderByField = opts?.orderByField ?? "createdAt";
  const direction = opts?.direction ?? "desc";
  const lim = opts?.limit;

  const q =
    typeof lim === "number"
      ? query(collection(db, path), orderBy(orderByField, direction), fbLimit(lim))
      : query(collection(db, path), orderBy(orderByField, direction));
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as T })));
    },
    (err) => {
      opts?.onError?.(err);
      console.warn("[listenCollection] snapshot error", { path, err });
    }
  );
}

export async function getUser(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function getEvent(eventId: string) {
  const ref = doc(db, "events", eventId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as EventDoc) : null;
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

export async function updateEvent(eventId: string, patch: Partial<EventDoc>) {
  await updateDoc(doc(db, "events", eventId), patch);
}

export function listenEventRsvps(
  eventId: string,
  cb: (docs: Array<{ id: string; data: RsvpDoc }>) => void
) {
  const q = query(collection(db, "events", eventId, "rsvps"), orderBy("updatedAt", "desc"), fbLimit(500));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as RsvpDoc })));
  });
}

export function listenEventRsvpCount(eventId: string, cb: (count: number) => void) {
  const q = query(collection(db, "events", eventId, "rsvps"));
  return onSnapshot(q, (snap) => cb(snap.size));
}

export async function clearRsvp(eventId: string, uid: string) {
  await deleteDoc(doc(db, "events", eventId, "rsvps", uid));
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

export async function createVideo(
  uid: string,
  data: Omit<VideoDoc, "addedBy" | "addedDate">
) {
  await addDoc(collection(db, "videos"), {
    ...data,
    addedBy: uid,
    addedDate: serverTimestamp(),
  });
}

export async function createCarouselSlide(
  uid: string,
  data: Omit<CarouselSlideDoc, "createdAt" | "createdBy">
) {
  await addDoc(collection(db, "carouselSlides"), {
    ...data,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCarouselSlide(slideId: string) {
  await deleteDoc(doc(db, "carouselSlides", slideId));
}

export async function updateCarouselSlide(slideId: string, patch: Partial<CarouselSlideDoc>) {
  await updateDoc(doc(db, "carouselSlides", slideId), patch);
}

export function listenPostsByUser(
  uid: string,
  cb: (docs: Array<{ id: string; data: PostDoc }>) => void,
  opts?: { limit?: number; onError?: (err: unknown) => void }
) {
  const lim = opts?.limit ?? 25;
  const q = query(
    collection(db, "posts"),
    where("createdBy", "==", uid),
    orderBy("createdAt", "desc"),
    fbLimit(lim)
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as PostDoc })));
    },
    (err) => {
      opts?.onError?.(err);
      console.warn("[listenPostsByUser] snapshot error", { uid, err });
    }
  );
}

export function listenUserRsvps(
  uid: string,
  cb: (docs: Array<{ eventId: string; data: RsvpDoc }>) => void,
  opts?: { onError?: (err: unknown) => void }
) {
  // events/{eventId}/rsvps/{uid}
  // Note: For collectionGroup queries, documentId() comparisons require full document *paths*.
  // We store `uid` inside each RSVP so we can query cleanly.
  const q = query(collectionGroup(db, "rsvps"), where("uid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => ({
          eventId: d.ref.parent.parent?.id ?? "",
          data: d.data() as RsvpDoc,
        }))
      );
    },
    (err) => {
      opts?.onError?.(err);
      console.warn("[listenUserRsvps] snapshot error", { uid, err });
    }
  );
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db, "posts", postId));
}

export async function updatePost(postId: string, patch: Partial<PostDoc>) {
  await updateDoc(doc(db, "posts", postId), patch);
}

export function listenComments(
  postId: string,
  cb: (docs: Array<{ id: string; data: CommentDoc }>) => void
) {
  // Prompt-aligned source: top-level `comments` where postId ==.
  const topQ = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "desc"),
    fbLimit(200)
  );

  // Back-compat source: legacy subcollection.
  const subQ = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "desc"),
    fbLimit(200)
  );

  const state: {
    top: Array<{ id: string; data: CommentDoc }>;
    sub: Array<{ id: string; data: CommentDoc }>;
  } = { top: [], sub: [] };

  const emit = () => {
    const map = new Map<string, CommentDoc>();
    for (const c of state.sub) map.set(c.id, { ...c.data, _source: "sub" });
    for (const c of state.top) map.set(c.id, { ...c.data, _source: "top" });
    cb(Array.from(map.entries()).map(([id, data]) => ({ id, data })));
  };

  const unsubTop = onSnapshot(topQ, (snap) => {
    state.top = snap.docs.map((d) => ({ id: d.id, data: d.data() as CommentDoc }));
    emit();
  });
  const unsubSub = onSnapshot(subQ, (snap) => {
    state.sub = snap.docs.map((d) => ({ id: d.id, data: d.data() as CommentDoc }));
    emit();
  });

  return () => {
    unsubTop();
    unsubSub();
  };
}

export async function addComment(postId: string, uid: string, body: string) {
  // Create a single ID so we can dual-write (top-level + legacy subcollection) without duplication.
  const topRef = doc(collection(db, "comments"));
  const commentId = topRef.id;

  const payload: CommentDoc = {
    postId,
    body,
    createdAt: serverTimestamp(),
    createdBy: uid,
  };

  await Promise.all([
    setDoc(topRef, payload),
    setDoc(doc(db, "posts", postId, "comments", commentId), {
      body,
      createdAt: serverTimestamp(),
      createdBy: uid,
    }),
  ]);

  await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
}

export async function deleteComment(postId: string, commentId: string) {
  await Promise.all([
    deleteDoc(doc(db, "comments", commentId)),
    deleteDoc(doc(db, "posts", postId, "comments", commentId)),
  ]);
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(-1) });
}

export async function updateUserProfile(uid: string, patch: Partial<UserDoc>) {
  await updateDoc(doc(db, "users", uid), patch);
}

export async function touchLastLogin(uid: string) {
  await updateDoc(doc(db, "users", uid), { lastLoginAt: serverTimestamp() });
}

export async function deleteUserDoc(uid: string) {
  await deleteDoc(doc(db, "users", uid));
}

export async function deletePostsByUser(uid: string, opts?: { limit?: number }) {
  const lim = opts?.limit ?? 200;
  const q = query(collection(db, "posts"), where("createdBy", "==", uid), fbLimit(lim));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

export async function setUserJoinAs(uid: string, joinAs?: string) {
  await updateDoc(doc(db, "users", uid), { joinAs: joinAs ?? null });
}

export async function setUserSuspended(uid: string, suspended: boolean) {
  await updateDoc(doc(db, "users", uid), { suspended });
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
  await setDoc(ref, { uid, status, updatedAt: serverTimestamp() }, { merge: true });
}

