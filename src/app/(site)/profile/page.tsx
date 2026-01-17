"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { useAuth } from "@/lib/AuthContext";
import {
  getFirebaseStorageBucketTroubleshootingMessage,
  isFirebaseConfigured,
  isFirebaseStorageBucketLikelyMisconfigured,
  storage,
} from "@/lib/firebaseClient";
import { getEvent, listenPostsByUser, listenUserRsvps, PostDoc, UserDoc } from "@/lib/firestore";
import PostCard from "@/components/feed/PostCard";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function tsToDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatMonthYear(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProfilePage() {
  const { currentUser, loading, updateProfile } = useAuth();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid ?? "";
  const isApproved = userDoc?.status === "approved";
  const [permError, setPermError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"posts" | "about" | "events">("posts");
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [myPosts, setMyPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>([]);
  const [events, setEvents] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!userDoc) return;
    setName(userDoc.name ?? "");
    setBio(userDoc.bio ?? "");
    setLocation(userDoc.location ?? "");
  }, [userDoc]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    // If your rules require approval for reads, avoid permission errors for pending users.
    if (!isApproved) {
      setMyPosts([]);
      return;
    }
    return listenPostsByUser(uid, setMyPosts, {
      limit: 25,
      onError: (err: any) => {
        if (err?.code === "permission-denied") {
          setPermError("You don’t have permission to load posts yet. Please wait for admin approval.");
          setMyPosts([]);
        }
      },
    });
  }, [uid, isApproved]);

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    if (!isApproved) {
      setRsvpEventIds([]);
      return;
    }
    return listenUserRsvps(
      uid,
      (docs) => {
        setRsvpEventIds(docs.map((d) => d.eventId).filter(Boolean));
      },
      {
        onError: (err: any) => {
          if (err?.code === "permission-denied") {
            setPermError("You don’t have permission to load event RSVPs yet. Please wait for admin approval.");
            setRsvpEventIds([]);
          }
        },
      }
    );
  }, [uid, isApproved]);

  useEffect(() => {
    let cancelled = false;
    const missing = rsvpEventIds.filter((id) => !(id in events));
    if (!isFirebaseConfigured || missing.length === 0) return;
    (async () => {
      const entries = await Promise.all(missing.map(async (id) => [id, await getEvent(id)] as const));
      if (cancelled) return;
      setEvents((prev) => {
        const next = { ...prev };
        for (const [id, ev] of entries) next[id] = ev ?? prev[id] ?? null;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [rsvpEventIds, events]);

  const joined = useMemo(() => formatMonthYear(tsToDate(userDoc?.requestedAt)), [userDoc?.requestedAt]);
  const roleBadge = userDoc?.joinAs ?? (userDoc?.role === "admin" ? "Admin" : "Member");

  const canSave = useMemo(() => {
    if (!isFirebaseConfigured || saving || uploadingAvatar) return false;
    if (isFirebaseStorageBucketLikelyMisconfigured()) return false;
    if (!uid) return false;
    if (!editing) return false;
    return true;
  }, [saving, uploadingAvatar, uid, editing]);

  async function uploadAvatarIfNeeded(): Promise<string | undefined> {
    if (!avatarFile) return undefined;
    if (!uid) return undefined;
    setUploadingAvatar(true);
    try {
      const bucketHint = getFirebaseStorageBucketTroubleshootingMessage();
      if (bucketHint) throw new Error(bucketHint);
      const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);
      await uploadBytes(storageRef, avatarFile, { contentType: avatarFile.type || "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      return url;
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    if (!uid) return;
    if (!isFirebaseConfigured) {
      setMsg({
        kind: "error",
        text: "Firebase isn’t configured yet. Add NEXT_PUBLIC_FIREBASE_* to .env.local.",
      });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const avatarUrl = await uploadAvatarIfNeeded();
      const patch: Partial<UserDoc> = {
        name: name.trim() || userDoc?.name || user?.email || "Member",
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        ...(avatarUrl ? { avatarUrl } : {}),
      };
      await updateProfile(patch);
      setMsg({ kind: "success", text: "Profile saved." });
      setAvatarFile(null);
      setEditing(false);
    } catch (err: any) {
      setMsg({ kind: "error", text: err?.message ?? "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
    setMsg(null);
    setAvatarFile(null);
    setName(userDoc?.name ?? "");
    setBio(userDoc?.bio ?? "");
    setLocation(userDoc?.location ?? "");
  }

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please login to view your profile.</p>;

  const currentAvatar = avatarPreview || userDoc?.avatarUrl;
  const isAdmin = userDoc?.role === "admin";

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {msg && (
        <div
          className={[
            "rounded-2xl border px-4 py-3 text-sm",
            msg.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900",
          ].join(" ")}
        >
          {msg.text}
        </div>
      )}

      {permError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {permError}
        </div>
      )}

      <Card>
        <CardBody>
          {/* Cover */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white">
            <div className="h-44 md:h-56 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
              <div className="absolute right-4 top-4">
                <Button variant="outline" type="button">
                  <span className="inline-flex items-center gap-2">
                    📷 <span>Edit Cover</span>
                  </span>
                </Button>
              </div>
            </div>

            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="relative -mt-16 md:-mt-20 flex items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white shadow-sm overflow-hidden bg-slate-100">
                    {currentAvatar ? (
                      <Image src={currentAvatar} alt="Profile photo" fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-slate-500 text-sm">
                        No photo
                      </div>
                    )}

                    <button
                      type="button"
                      className="absolute -right-1 -bottom-1 h-12 w-12 rounded-full bg-slate-950 text-white grid place-items-center border-4 border-white"
                      aria-label="Edit profile picture"
                      onClick={() => fileRef.current?.click()}
                      disabled={!editing || uploadingAvatar}
                      title={editing ? "Change photo" : "Enable Edit Profile to change photo"}
                    >
                      {uploadingAvatar ? "…" : "📷"}
                    </button>
                  </div>

                  <input
                    ref={fileRef}
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                  />

                  <div className="pb-3">
                    <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-950">
                      {userDoc?.name ?? "Member"}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 font-bold">
                        {roleBadge}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        📍 <span>{userDoc?.location ?? "—"}</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        📅 <span>Joined {joined}</span>
                      </span>
                      <span className="inline-flex items-center gap-2">
                        ✉️ <span>{userDoc?.email ?? user.email}</span>
                      </span>
                    </div>
                    <div className="mt-3 text-slate-700">
                      {userDoc?.bio ?? "Add a short bio to tell the club about you."}
                    </div>
                  </div>
                </div>

                <div className="pb-3">
                  <Button
                    variant="dark"
                    type="button"
                    onClick={() => setEditing(true)}
                    disabled={editing}
                  >
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Stats row (placeholders for now) */}
              <div className="mt-6 border-t border-slate-100 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <Stat label="Connections" value="—" />
                <Stat label="Posts" value={String(myPosts.length)} />
                <Stat label="Events" value={String(rsvpEventIds.length)} />
                <Stat label="Likes" value="—" />
              </div>

              {/* Tabs */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-2 flex gap-2 overflow-auto">
                <Tab label="Posts" active={activeTab === "posts"} onClick={() => setActiveTab("posts")} />
                <Tab label="About" active={activeTab === "about"} onClick={() => setActiveTab("about")} />
                <Tab
                  label="Events"
                  active={activeTab === "events"}
                  onClick={() => setActiveTab("events")}
                />
                <Tab
                  label="Edit Profile"
                  active={editing}
                  onClick={() => setEditing(true)}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Edit panel */}
      {editing && (
        <Card>
          <CardHeader>
            <div className="font-bold">Edit Profile</div>
            <div className="text-sm text-slate-600 mt-1">
              Update your name, bio, location, and profile picture.
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Name</label>
                <Input className="bg-slate-100 border-slate-100" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold">Location</label>
                <Input
                  className="bg-slate-100 border-slate-100"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="md:col-span-2 grid gap-2">
                <label className="text-sm font-semibold">Bio</label>
                <textarea
                  className="w-full rounded-xl border border-slate-100 bg-slate-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-28"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a bit about yourself..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={cancel} disabled={saving || uploadingAvatar}>
                Cancel
              </Button>
              <Button variant="dark" type="button" onClick={save} disabled={!canSave}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Avatar uploads to Firebase Storage at <code>profiles/{uid}/avatar.jpg</code>.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Tab content */}
      {activeTab === "posts" && (
        <div className="grid gap-6">
          {myPosts.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-slate-700">No posts yet.</p>
                <div className="mt-3">
                  <Link href="/create-post">
                    <Button variant="dark">Create your first post</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : (
            myPosts.map(({ id, data }) => (
              <PostCard
                key={id}
                postId={id}
                post={data}
                author={userDoc}
                uid={uid}
                canInteract={Boolean(userDoc?.status === "approved" && isFirebaseConfigured)}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "about" && (
        <Card>
          <CardHeader>
            <div className="font-bold">About</div>
            <div className="text-sm text-slate-600 mt-1">Bio, contact info, and stats.</div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Info label="Email" value={userDoc?.email ?? user.email ?? "—"} />
              <Info label="Location" value={userDoc?.location ?? "—"} />
              <Info label="Joined" value={joined} />
            </div>
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500">Bio</div>
              <div className="mt-1 text-slate-800">{userDoc?.bio ?? "—"}</div>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === "events" && (
        <Card>
          <CardHeader>
            <div className="font-bold">Events</div>
            <div className="text-sm text-slate-600 mt-1">Events you’re attending/interested in.</div>
          </CardHeader>
          <CardBody>
            {rsvpEventIds.length === 0 ? (
              <p className="text-slate-700">No event RSVPs yet.</p>
            ) : (
              <div className="grid gap-3">
                {rsvpEventIds.slice(0, 10).map((id) => (
                  <div key={id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-semibold text-slate-900">{events[id]?.title ?? "Event"}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {events[id]?.dateTime ? new Date(events[id].dateTime).toLocaleString() : "—"}
                      {events[id]?.location ? ` · ${events[id].location}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
      <div className="text-sm text-slate-600 mt-1">{label}</div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap",
        active ? "bg-white border border-slate-200 shadow-sm" : "text-slate-700 hover:bg-white/60",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900 break-words">{value}</div>
    </div>
  );
}

