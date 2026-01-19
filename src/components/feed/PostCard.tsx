"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";

import { db, isFirebaseConfigured } from "@/lib/firebaseClient";
import {
  addComment,
  CommentDoc,
  deleteComment,
  deletePost,
  listenComments,
  PostDoc,
  toggleSave,
  toggleLike,
  updatePost,
  UserDoc,
} from "@/lib/firestore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card, { CardBody } from "@/components/ui/Card";
import { AuthModal, AuthModalTrigger } from "@/app/components/AuthModal";
import { useToast } from "@/components/ui/ToastProvider";
import { useHydrated } from "@/lib/useHydrated";

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(d: Date | null) {
  if (!d) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours ago`;
  const days = Math.floor(h / 24);
  return `${days} days ago`;
}

export default function PostCard({
  postId,
  post,
  author,
  uid,
  canInteract,
  isAdmin,
}: {
  postId: string;
  post: PostDoc;
  author?: UserDoc | null;
  uid?: string | null;
  canInteract: boolean;
  isAdmin?: boolean;
}) {
  const { toast } = useToast();
  const hydrated = useHydrated();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [comments, setComments] = useState<Array<{ id: string; data: CommentDoc }>>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState<AuthModalTrigger>("general");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title ?? "");
  const [editBody, setEditBody] = useState(post.body ?? "");
  const [saving, setSaving] = useState(false);

  const displayName = post.authorName ?? author?.name ?? "Member";
  const displayAvatar = post.authorAvatar ?? author?.avatarUrl ?? null;
  const created = useMemo(() => tsToDate(post.createdAt), [post.createdAt]);
  const isOwner = Boolean(uid && uid === post.createdBy);
  const canManage = Boolean(uid && (isOwner || isAdmin));

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) return;
    const ref = doc(db, "posts", postId, "likes", uid);
    return onSnapshot(
      ref,
      (snap) => setLiked(snap.exists()),
      (err) => {
        console.warn("[PostCard] like listener error", { postId, uid, err });
        setLiked(false);
      }
    );
  }, [postId, uid]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const likesRef = collection(db, "posts", postId, "likes");
    return onSnapshot(
      likesRef,
      (snap) => setLikeCount(snap.size),
      (err) => {
        console.warn("[PostCard] likes count listener error", { postId, err });
        setLikeCount(0);
      }
    );
  }, [postId]);

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) return;
    const ref = doc(db, "posts", postId, "saves", uid);
    return onSnapshot(
      ref,
      (snap) => setSaved(snap.exists()),
      (err) => {
        console.warn("[PostCard] save listener error", { postId, uid, err });
        setSaved(false);
      }
    );
  }, [postId, uid]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const savesRef = collection(db, "posts", postId, "saves");
    return onSnapshot(
      savesRef,
      (snap) => setSaveCount(snap.size),
      (err) => {
        console.warn("[PostCard] saves count listener error", { postId, err });
        setSaveCount(0);
      }
    );
  }, [postId]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return listenComments(postId, setComments);
  }, [postId]);

  async function submitComment(opts?: { parentCommentId?: string | null }) {
    if (!uid) return;
    if (!isFirebaseConfigured) return;
    const raw = opts?.parentCommentId ? replyText : commentText;
    const text = raw.trim().slice(0, 300);
    if (!text) return;
    setCommenting(true);
    try {
      await addComment(postId, uid, text, opts);
      if (opts?.parentCommentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setCommentText("");
      }
      setCommentsOpen(true);
    } finally {
      setCommenting(false);
    }
  }

  async function onDelete() {
    if (!canManage) return;
    if (!isFirebaseConfigured) return;
    const ok = window.confirm("Delete this post? This cannot be undone.");
    if (!ok) return;
    await deletePost(postId);
  }

  async function onSaveEdit() {
    if (!canManage) return;
    if (!isFirebaseConfigured) return;
    const nextTitle = editTitle.trim();
    const nextBody = editBody.trim();
    if (!nextBody) return;
    setSaving(true);
    try {
      await updatePost(postId, { title: nextTitle, body: nextBody });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!uid) return;
    if (!isFirebaseConfigured) return;
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;
    await deleteComment(postId, commentId);
  }

  async function onShare() {
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
      const url = `${origin}/dashboard?post=${encodeURIComponent(postId)}`;
      await navigator.clipboard.writeText(url);
      toast({ kind: "success", title: "Link copied", description: "You can paste it anywhere." });
    } catch {
      toast({
        kind: "error",
        title: "Copy failed",
        description: "Your browser blocked clipboard access. Try copying the URL from the address bar.",
      });
    }
  }

  const commentChildren = useMemo(() => {
    const map = new Map<string, Array<{ id: string; data: CommentDoc }>>();
    for (const c of comments) {
      const parent = c.data.parentCommentId ?? null;
      if (!parent) continue;
      const arr = map.get(parent) ?? [];
      arr.push(c);
      map.set(parent, arr);
    }
    // oldest-first within a thread
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ad = tsToDate(a.data.createdAt)?.getTime() ?? 0;
        const bd = tsToDate(b.data.createdAt)?.getTime() ?? 0;
        return ad - bd;
      });
      map.set(k, arr);
    }
    return map;
  }, [comments]);

  const rootComments = useMemo(() => {
    const roots = comments.filter((c) => !c.data.parentCommentId);
    // oldest-first for readability
    roots.sort((a, b) => {
      const ad = tsToDate(a.data.createdAt)?.getTime() ?? 0;
      const bd = tsToDate(b.data.createdAt)?.getTime() ?? 0;
      return ad - bd;
    });
    return roots;
  }, [comments]);

  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 relative shrink-0">
            {displayAvatar ? (
              <Image src={displayAvatar} alt="" fill className="object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-xs font-bold text-slate-700">
                {displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/members/${post.createdBy}`}
                  className="font-extrabold text-slate-950 hover:underline"
                >
                  {displayName}
                </Link>
                <div className="text-sm text-slate-500">{hydrated ? timeAgo(created) : ""}</div>
              </div>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setEditTitle(post.title ?? "");
                      setEditBody(post.body ?? "");
                      setEditing(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" type="button" onClick={onDelete}>
                    Delete
                  </Button>
                </div>
              ) : (
                <div />
              )}
            </div>

            {editing ? (
              <div className="mt-4 grid gap-3">
                <Input
                  className="bg-slate-100 border-slate-100"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title (optional)"
                />
                <textarea
                  className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-28"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Write something..."
                />
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="dark"
                    type="button"
                    onClick={onSaveEdit}
                    disabled={saving || !editBody.trim()}
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {post.title && <div className="mt-3 font-semibold text-slate-950">{post.title}</div>}
                <div className="mt-2 whitespace-pre-wrap text-slate-800 leading-relaxed">{post.body}</div>
              </>
            )}

            {post.imageUrl && (
              <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <div className="relative aspect-[16/10]">
                  <Image src={post.imageUrl} alt="" fill className="object-cover" />
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4 flex items-center gap-6 text-sm text-slate-700">
              <button
                type="button"
                className="inline-flex items-center gap-2 hover:text-slate-900 disabled:opacity-50"
                disabled={uid ? !canInteract : false}
                onClick={() => {
                  if (!uid) return setAuthGateOpen(true);
                  if (!canInteract) return;
                  return toggleLike(postId, uid, !liked);
                }}
              >
                <span className={liked ? "text-rose-500" : ""}>♥</span>{" "}
                {liked ? "Liked" : "Like"} <span className="text-slate-400">({likeCount})</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 hover:text-slate-900 disabled:opacity-50"
                onClick={() => setCommentsOpen((v) => !v)}
              >
                💬 Comment <span className="text-slate-400">({comments.length})</span>
              </button>

              <button
                type="button"
                className="inline-flex items-center gap-2 hover:text-slate-900 disabled:opacity-50"
                disabled={uid ? !canInteract : false}
                onClick={() => {
                  if (!uid) return setAuthGateOpen(true);
                  if (!canInteract) return;
                  return toggleSave(postId, uid, !saved);
                }}
                title={saved ? "Remove bookmark" : "Save / bookmark"}
              >
                <span className={saved ? "text-slate-900" : "text-slate-500"}>{saved ? "🔖" : "📑"}</span>{" "}
                Save <span className="text-slate-400">({saveCount})</span>
              </button>

              <button
                type="button"
                className="ml-auto inline-flex items-center gap-2 hover:text-slate-900"
                onClick={onShare}
                title="Copy link"
              >
                🔗 Share
              </button>
            </div>

            {(commentsOpen || comments.length > 0) && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {comments.length > 0 ? (
                  <div className="grid gap-3">
                    {rootComments.map(({ id, data }) => {
                      const aName = data.authorName ?? "Member";
                      const when = hydrated ? timeAgo(tsToDate(data.createdAt)) : "";
                      const initials =
                        (aName ?? "M")
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join("") || "M";

                      const replies = commentChildren.get(id) ?? [];
                      const hasReplies = replies.length > 0;
                      const canDelete = Boolean(uid && (uid === data.createdBy || isAdmin));
                      const deleteDisabled = hasReplies; // MVP: avoid orphaning replies

                      return (
                        <div key={id} className="grid gap-2">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-full overflow-hidden bg-slate-200 relative shrink-0">
                              {data.authorAvatar ? (
                                <Image src={data.authorAvatar} alt="" fill className="object-cover" />
                              ) : (
                                <div className="h-full w-full grid place-items-center text-[11px] font-bold text-slate-700">
                                  {initials}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="text-sm">
                                  <span className="font-semibold text-slate-900">{aName}</span>
                                  <span className="text-slate-400"> · {when}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    className="text-xs font-semibold text-slate-700 hover:underline"
                                    onClick={() => {
                                      if (!uid) {
                                        setAuthTrigger("comment");
                                        setAuthGateOpen(true);
                                        return;
                                      }
                                      setReplyTo({ id, name: aName });
                                      setCommentsOpen(true);
                                    }}
                                  >
                                    Reply
                                  </button>
                                  {canDelete && (
                                    <button
                                      type="button"
                                      className={[
                                        "text-xs font-semibold",
                                        deleteDisabled ? "text-slate-400 cursor-not-allowed" : "text-rose-700 hover:underline",
                                      ].join(" ")}
                                      title={deleteDisabled ? "Deleting comments with replies isn’t supported yet." : "Delete"}
                                      onClick={() => {
                                        if (deleteDisabled) return;
                                        onDeleteComment(id);
                                      }}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{data.body}</div>
                            </div>
                          </div>

                          {replies.length > 0 && (
                            <div className="ml-10 grid gap-2">
                              {replies.map(({ id: rid, data: rdata }) => {
                                const rName = rdata.authorName ?? "Member";
                                const rwhen = hydrated ? timeAgo(tsToDate(rdata.createdAt)) : "";
                                const rinitials =
                                  (rName ?? "M")
                                    .split(/\s+/)
                                    .slice(0, 2)
                                    .map((p) => p[0]?.toUpperCase())
                                    .join("") || "M";
                                const rCanDelete = Boolean(uid && (uid === rdata.createdBy || isAdmin));
                                return (
                                  <div key={rid} className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-200 relative shrink-0">
                                      {rdata.authorAvatar ? (
                                        <Image src={rdata.authorAvatar} alt="" fill className="object-cover" />
                                      ) : (
                                        <div className="h-full w-full grid place-items-center text-[10px] font-bold text-slate-700">
                                          {rinitials}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="text-sm">
                                          <span className="font-semibold text-slate-900">{rName}</span>
                                          <span className="text-slate-400"> · {rwhen}</span>
                                        </div>
                                        {rCanDelete && (
                                          <button
                                            type="button"
                                            className="text-xs font-semibold text-rose-700 hover:underline"
                                            onClick={() => onDeleteComment(rid)}
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{rdata.body}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {replyTo?.id === id && uid && (
                            <div className="ml-10 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-slate-600">
                                  Replying to <span className="text-slate-900">{replyTo.name}</span>
                                </div>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-slate-600 hover:underline"
                                  onClick={() => {
                                    setReplyTo(null);
                                    setReplyText("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                              <textarea
                                className="mt-2 w-full rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-16"
                                placeholder={canInteract ? "Write a reply..." : "Approval required to comment"}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value.slice(0, 300))}
                                disabled={!canInteract}
                              />
                              <div className="mt-2 flex items-center justify-between">
                                <div className="text-xs text-slate-500">{replyText.length}/300</div>
                                <Button
                                  variant="dark"
                                  size="sm"
                                  type="button"
                                  disabled={!canInteract || commenting || !replyText.trim()}
                                  onClick={() => submitComment({ parentCommentId: id })}
                                >
                                  {commenting ? "Posting..." : "Reply"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 text-center">
                    No comments yet — be the first to start the conversation.
                  </div>
                )}

                <div className="mt-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {!uid ? (
                      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-4 text-center">
                        <div className="text-sm text-slate-800">
                          <span className="font-extrabold">Want to comment?</span> Join the community to share your
                          thoughts.
                        </div>
                        <div className="mt-3 flex justify-center">
                          <Button
                            variant="dark"
                            type="button"
                            onClick={() => {
                              setAuthTrigger("comment");
                              setAuthGateOpen(true);
                            }}
                          >
                            Sign up / Login to comment
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <textarea
                          className="w-full rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-20"
                          placeholder={canInteract ? "Write a comment..." : "Approval required to comment"}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value.slice(0, 300))}
                          disabled={!canInteract}
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-xs text-slate-500">{commentText.length}/300</div>
                          <Button
                            variant="dark"
                            type="button"
                            disabled={!canInteract || commenting || !commentText.trim()}
                            onClick={() => submitComment({ parentCommentId: null })}
                          >
                            {commenting ? "Posting..." : "Post"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardBody>
      <AuthModal open={authGateOpen} onOpenChange={setAuthGateOpen} trigger={authTrigger} />
    </Card>
  );
}

