"use client";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
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
  countryCode?: string;
  phoneNumber?: string; // 10-digit national number (digits only)
  fullPhoneNumber?: string; // countryCode + phoneNumber
  phone?: string;
  avatarUrl?: string;
  avatarStoragePath?: string;
  bio?: string;
  location?: string;
  sportsInterests?: string[];
  goals?: string;
  lastLoginAt?: any;
  updatedAt?: any;
  suspended?: boolean;
  sportInterest?: string;
  joinAs?: string;
  agreedToTerms?: boolean;
  wantsUpdates?: boolean;
  stats?: {
    posts: number;
    connections: number;
    events: number;
    likes: number;
  };
  events?: string[];
  status: UserStatus;
  role: UserRole;
  requestedAt: any;
};

export type EventDoc = {
  title: string;
  dateTime: string;
  // Prompt-aligned optional fields
  bannerImage?: string;
  category?: "tournament" | "training" | "social" | "workshop";
  maxParticipants?: number | null;
  registeredUsers?: string[];
  registrationCount?: number;
  status?: "upcoming" | "ongoing" | "completed" | "cancelled";
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
  body: string; // legacy + current feed rendering
  content?: string; // prompt field (alias of body)
  imageUrl?: string;
  privacy?: "public" | "members" | "friends";
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  authorRole?: string;
  likes?: number;
  likedBy?: string[];
  comments?: unknown[];
  commentCount?: number;
  createdAt: any;
  updatedAt?: any;
  createdBy: string;
};

export type CommentDoc = {
  postId?: string;
  body: string;
  authorName?: string;
  authorAvatar?: string;
  parentCommentId?: string | null;
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

function stripUndefined<T>(value: T): T {
  if (value === undefined) return null as any;
  if (value === null) return value;
  if (Array.isArray(value)) {
    // Remove undefined entries (Firestore rejects them)
    return value.filter((v) => v !== undefined).map((v) => stripUndefined(v)) as any;
  }
  if (typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value as any)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

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
  await updateDoc(doc(db, "events", eventId), stripUndefined(patch));
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

export async function registerForEventOptIn(eventId: string, uid: string) {
  // Maintain our existing RSVP doc as the source-of-truth for registration.
  // Also update prompt-style fields on the event doc and user doc for easy UI rendering.
  await Promise.all([
    setRsvp(eventId, uid, "going"),
    updateDoc(doc(db, "events", eventId), {
      registeredUsers: arrayUnion(uid),
      registrationCount: increment(1),
    }),
    updateDoc(doc(db, "users", uid), {
      events: arrayUnion(eventId),
      ["stats.events"]: increment(1),
    } as any),
  ]);
}

export async function unregisterFromEventOptIn(eventId: string, uid: string) {
  await Promise.all([
    clearRsvp(eventId, uid),
    updateDoc(doc(db, "events", eventId), {
      registeredUsers: arrayRemove(uid),
      registrationCount: increment(-1),
    }),
    updateDoc(doc(db, "users", uid), {
      events: arrayRemove(eventId),
      ["stats.events"]: increment(-1),
    } as any),
  ]);
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
    updatedAt: serverTimestamp(),
    createdBy: uid,
  });
}

export function newPostId() {
  return doc(collection(db, "posts")).id;
}

export async function createPostWithId(
  uid: string,
  postId: string,
  data: Omit<PostDoc, "createdAt" | "createdBy">
) {
  await setDoc(doc(db, "posts", postId), stripUndefined({
    postId,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: uid,
  }));
}

export async function incrementUserPosts(uid: string) {
  await updateDoc(doc(db, "users", uid), { ["stats.posts"]: increment(1) } as any);
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
  await updateDoc(doc(db, "carouselSlides", slideId), stripUndefined(patch));
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
  await updateDoc(doc(db, "posts", postId), stripUndefined(patch));
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

export async function addComment(
  postId: string,
  uid: string,
  body: string,
  opts?: { parentCommentId?: string | null }
): Promise<string> {
  // Create a single ID so we can dual-write (top-level + legacy subcollection) without duplication.
  const topRef = doc(collection(db, "comments"));
  const commentId = topRef.id;

  // Attach denormalized author info so we don't need to read other users' docs client-side.
  let authorName: string | undefined;
  let authorAvatar: string | undefined;
  try {
    const meSnap = await getDoc(doc(db, "users", uid));
    if (meSnap.exists()) {
      const me = meSnap.data() as UserDoc;
      authorName = me.name;
      authorAvatar = me.avatarUrl;
    }
  } catch {
    // ignore
  }

  const payload: CommentDoc = {
    postId,
    body,
    ...(authorName ? { authorName } : {}),
    ...(authorAvatar ? { authorAvatar } : {}),
    createdAt: serverTimestamp(),
    createdBy: uid,
    ...(opts?.parentCommentId ? { parentCommentId: opts.parentCommentId } : {}),
  };

  await Promise.all([
    setDoc(topRef, payload),
    setDoc(doc(db, "posts", postId, "comments", commentId), {
      body,
      ...(authorName ? { authorName } : {}),
      ...(authorAvatar ? { authorAvatar } : {}),
      createdAt: serverTimestamp(),
      createdBy: uid,
      ...(opts?.parentCommentId ? { parentCommentId: opts.parentCommentId } : {}),
    }),
  ]);

  await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
  return commentId;
}

export async function deleteComment(postId: string, commentId: string) {
  await Promise.all([
    deleteDoc(doc(db, "comments", commentId)),
    deleteDoc(doc(db, "posts", postId, "comments", commentId)),
  ]);
  await updateDoc(doc(db, "posts", postId), { commentCount: increment(-1) });
}

export async function updateUserProfile(uid: string, patch: Partial<UserDoc>) {
  await updateDoc(doc(db, "users", uid), stripUndefined({ ...patch, updatedAt: serverTimestamp() }));
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

export async function toggleSave(postId: string, uid: string, shouldSave: boolean) {
  const saveRef = doc(db, "posts", postId, "saves", uid);
  if (shouldSave) {
    await setDoc(saveRef, { createdAt: serverTimestamp() });
  } else {
    await deleteDoc(saveRef);
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

