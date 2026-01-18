"use client";

/**
 * Posts service (adapter)
 * - The Figma prompt suggests a separate postsService with counts on the post doc and a global `likes` collection.
 * - Our app already implements posts/comments/likes via:
 *   - Firestore: `src/lib/firestore.ts`
 *   - Firebase client: `src/lib/firebaseClient.ts`
 *   - UI: `src/components/feed/PostCard.tsx`, `src/app/components/CreatePostPage.tsx`
 *
 * This file provides a convenient service-style API without changing the underlying data model.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { db, isFirebaseConfigured, storage } from "@/lib/firebaseClient";
import {
  addComment as addCommentCore,
  createPostWithId,
  deleteComment as deleteCommentCore,
  deletePost as deletePostCore,
  getUser,
  incrementUserPosts,
  newPostId,
  PostDoc,
  toggleLike,
} from "@/lib/firestore";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  content: string;
  imageUrl?: string;
  likesCount: number; // derived in UI from likes subcollection size
  commentsCount: number; // derived from `commentCount` when present, else UI can count comments
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  parentCommentId?: string | null;
  createdAt: any;
}

function derivePostFromDoc(id: string, data: PostDoc): Post {
  return {
    id,
    authorId: data.createdBy,
    authorName: data.authorName ?? "",
    authorAvatar: data.authorAvatar ?? "",
    authorRole: data.authorRole ?? "",
    content: data.body ?? data.content ?? "",
    imageUrl: data.imageUrl,
    likesCount: data.likes ?? 0,
    commentsCount: data.commentCount ?? 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// Create a new post (uploads image if provided)
export async function createPost(args: {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  content: string;
  privacy?: "public" | "members" | "friends";
  imageFile?: File;
}): Promise<string> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");

  const postId = newPostId();
  let imageUrl: string | null = null;

  if (args.imageFile) {
    const f = args.imageFile;
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `post-images/${args.userId}/${postId}/${Date.now()}.${ext}`;
    const r = ref(storage, path);
    await uploadBytes(r, f, { contentType: f.type || "image/jpeg" });
    imageUrl = await getDownloadURL(r);
  }

  await createPostWithId(args.userId, postId, {
    title: args.content.trim().slice(0, 60) || "Post",
    body: args.content,
    content: args.content,
    imageUrl: imageUrl ?? undefined,
    privacy: args.privacy ?? "public",
    authorId: args.userId,
    authorName: args.userName,
    authorAvatar: args.userAvatar,
    authorRole: args.userRole,
    likedBy: [],
    likes: 0,
    commentCount: 0,
  } as any);

  try {
    await incrementUserPosts(args.userId);
  } catch {
    // non-blocking
  }

  return postId;
}

// Subscribe to latest posts
export function subscribeToPosts(callback: (posts: Post[]) => void, opts?: { limit?: number }) {
  const lim = opts?.limit ?? 50;
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(lim));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => derivePostFromDoc(d.id, d.data() as PostDoc)));
  });
}

export async function getUserPosts(userId: string, opts?: { limit?: number }): Promise<Post[]> {
  const lim = opts?.limit ?? 50;
  const q = query(
    collection(db, "posts"),
    where("createdBy", "==", userId),
    orderBy("createdAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => derivePostFromDoc(d.id, d.data() as PostDoc));
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");

  // Ownership check
  const postSnap = await getDoc(doc(db, "posts", postId));
  if (!postSnap.exists()) throw new Error("Post not found");
  const post = postSnap.data() as PostDoc;
  if (post.createdBy !== userId) throw new Error("Unauthorized");

  // Best-effort: delete top-level comments for this post
  try {
    const cSnap = await getDocs(query(collection(db, "comments"), where("postId", "==", postId)));
    const batch = writeBatch(db);
    cSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch {
    // ignore
  }

  // Best-effort: delete post image if we can derive a storage ref.
  try {
    // We currently store only `imageUrl` (download URL) for post images.
    // Deleting requires a storage path or a ref-from-URL helper; we don't have that reliably here.
    // If we later store `imageStoragePath` on posts, we can delete by `ref(storage, imageStoragePath)`.
    void post;
  } catch {
    // ignore
  }

  await deletePostCore(postId);
}

// Toggle like (our model: `posts/{postId}/likes/{uid}`)
export async function likePost(postId: string, userId: string): Promise<void> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  const likeRef = doc(db, "posts", postId, "likes", userId);
  const existing = await getDoc(likeRef);
  await toggleLike(postId, userId, !existing.exists());

  // Optional future: create notifications here (we don't have notifications collection wired yet).
}

export async function hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
  const likeRef = doc(db, "posts", postId, "likes", userId);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export async function addComment(args: {
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<string> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  return await addCommentCore(args.postId, args.userId, args.content, { parentCommentId: args.parentCommentId });
}

export function subscribeToComments(postId: string, callback: (comments: Comment[]) => void) {
  // Top-level comments source (the app uses `listenComments` elsewhere).
  const q = query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, async (snap) => {
    const rows = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data() as any;
        const u = data.createdBy ? await getUser(String(data.createdBy)) : null;
        return {
          id: d.id,
          postId,
          authorId: String(data.createdBy ?? ""),
          authorName: u?.name ?? "Member",
          authorAvatar: u?.avatarUrl ?? "",
          content: String(data.body ?? ""),
          parentCommentId: data.parentCommentId ?? null,
          createdAt: data.createdAt,
        } satisfies Comment;
      })
    );
    callback(rows);
  });
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  // Our canonical delete helper lives in `src/lib/firestore.ts`
  await deleteCommentCore(postId, commentId);
}

