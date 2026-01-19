"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchSignInMethodsForEmail,
  updateEmail,
} from "firebase/auth";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { useAuth } from "@/lib/AuthContext";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import {
  getFirebaseStorageBucketTroubleshootingMessage,
  isFirebaseConfigured,
  storage,
} from "@/lib/firebaseClient";
import { auth } from "@/lib/firebaseClient";
import { getEvent, listenPostsByUser, listenUserRsvps, PostDoc, UserDoc } from "@/lib/firestore";
import PostCard from "@/components/feed/PostCard";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import { profileEditSchema } from "@/lib/validation";
import { LoadingSpinner } from "@/components/LoadingSpinner";

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

function onlyLetters(s: string) {
  return /^[A-Za-z]+$/.test(s);
}

function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 10);
  if (d.length <= 3) return a;
  if (d.length <= 6) return `(${a}) ${b}`;
  return `(${a}) ${b}-${c}`;
}

function fileIsAllowedImage(f: File) {
  return f.type === "image/jpeg" || f.type === "image/png";
}

type Tab = "posts" | "about" | "achievements" | "edit";

type EditForm = {
  firstName: string;
  lastName: string;
  bio?: string;
  location?: string;
  email: string;
  countryCode: string;
  phoneNumber: string; // digits only
  sportsInterests?: Record<string, boolean>;
  goals?: string;
};

const SPORT_OPTIONS = ["Cricket", "Basketball", "Soccer", "Tennis", "Volleyball", "Running", "Swimming", "Other"];
const COUNTRY_CODES = [
  { value: "+1", label: "+1 (USA)" },
  { value: "+91", label: "+91 (India)" },
  { value: "+44", label: "+44 (UK)" },
  { value: "+61", label: "+61 (Australia)" },
  { value: "+27", label: "+27 (South Africa)" },
  { value: "+64", label: "+64 (New Zealand)" },
];

function initSportsMap(doc: UserDoc | null): Record<string, boolean> {
  const set = new Set<string>(doc?.sportsInterests ?? (doc?.sportInterest ? [doc.sportInterest] : []));
  const map: Record<string, boolean> = {};
  for (const s of SPORT_OPTIONS) map[s] = set.has(s);
  return map;
}

function selectedSports(map: Record<string, boolean>) {
  return Object.entries(map)
    .filter(([, v]) => v)
    .map(([k]) => k);
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser, loading, updateProfile } = useAuth();
  const router = useRouter();
  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;
  const uid = user?.uid ?? "";
  const isApproved = userDoc?.status === "approved" || userDoc?.status === "active";
  const isAdmin = userDoc?.role === "admin";

  const [tab, setTab] = useState<Tab>("posts");
  const [permError, setPermError] = useState<string | null>(null);
  const [myPosts, setMyPosts] = useState<Array<{ id: string; data: PostDoc }>>([]);
  const [rsvpEventIds, setRsvpEventIds] = useState<string[]>([]);
  const [events, setEvents] = useState<Record<string, any>>({});

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const joined = useMemo(() => formatMonthYear(tsToDate(userDoc?.requestedAt)), [userDoc?.requestedAt]);

  // listeners (posts + events)
  useEffect(() => {
    if (!isFirebaseConfigured || !uid) return;
    setPermError(null);
    if (!isApproved) {
      setMyPosts([]);
      return;
    }
    return listenPostsByUser(uid, setMyPosts, {
      limit: 50,
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
    setPermError(null);
    if (!isApproved) {
      setRsvpEventIds([]);
      return;
    }
    return listenUserRsvps(
      uid,
      (docs) => setRsvpEventIds(docs.map((d) => d.eventId).filter(Boolean)),
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

  // avatar preview
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // edit form
  const defaultSports = useMemo(() => initSportsMap(userDoc), [userDoc]);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    defaultValues: {
      firstName: userDoc?.firstName ?? "",
      lastName: userDoc?.lastName ?? "",
      bio: userDoc?.bio ?? "",
      location: userDoc?.location ?? "",
      email: (user?.email ?? userDoc?.email ?? "").toLowerCase(),
      countryCode: userDoc?.countryCode ?? "+1",
      phoneNumber: userDoc?.phoneNumber ?? "",
      sportsInterests: defaultSports,
      goals: userDoc?.goals ?? "",
    },
    mode: "onTouched",
    resolver: zodResolver(profileEditSchema),
  });

  const wBio = watch("bio") ?? "";
  const wEmail = (watch("email") ?? "").toLowerCase();
  const wPhoneDigits = (watch("phoneNumber") ?? "").replace(/\D/g, "").slice(0, 10);
  const wSportsMap = watch("sportsInterests") ?? defaultSports;

  useEffect(() => {
    // keep phone digits only in form state
    const current = watch("phoneNumber") ?? "";
    const digits = current.replace(/\D/g, "").slice(0, 10);
    if (digits !== current) setValue("phoneNumber", digits, { shouldValidate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wPhoneDigits]);

  useEffect(() => {
    if (!userDoc || !user) return;
    reset({
      firstName: userDoc.firstName ?? "",
      lastName: userDoc.lastName ?? "",
      bio: userDoc.bio ?? "",
      location: userDoc.location ?? "",
      email: (user.email ?? userDoc.email ?? "").toLowerCase(),
      countryCode: userDoc.countryCode ?? "+1",
      phoneNumber: userDoc.phoneNumber ?? "",
      sportsInterests: initSportsMap(userDoc),
      goals: userDoc.goals ?? "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [userDoc, user, reset]);

  const hasUnsaved = isDirty || Boolean(avatarFile);
  useEffect(() => {
    if (tab !== "edit") return;
    if (!hasUnsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [tab, hasUnsaved]);

  async function checkEmailUniqueness(emailLower: string, authUserEmail: string | null | undefined) {
    if (!emailLower) return;
    if (emailLower === (authUserEmail ?? "").toLowerCase()) {
      clearErrors("email");
      setEmailStatus("idle");
      return;
    }
    try {
      setEmailStatus("checking");
      const methods = await fetchSignInMethodsForEmail(auth, emailLower);
      if (methods.length > 0) {
        setEmailStatus("taken");
        setError("email", { type: "validate", message: "Email already taken" });
      } else {
        setEmailStatus("available");
        clearErrors("email");
      }
    } catch {
      setEmailStatus("idle");
      // If we can't validate (network), don't hard-block.
    }
  }

  // Debounced email uniqueness check (500ms) while in Edit tab
  useEffect(() => {
    if (tab !== "edit") return;
    if (!isFirebaseConfigured) return;
    if (!user) return;
    const emailLower = (wEmail ?? "").trim().toLowerCase();
    if (!emailLower) {
      setEmailStatus("idle");
      return;
    }
    if (errors.email?.message) {
      setEmailStatus("idle");
      return;
    }
    const t = window.setTimeout(() => {
      checkEmailUniqueness(emailLower, user.email);
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wEmail, tab, user?.email, errors.email?.message]);

  const connectionsCount = userDoc?.stats?.connections ?? 0;
  const postsCount = myPosts.length;
  const eventsCount = rsvpEventIds.length;
  const likesReceived = userDoc?.stats?.likes ?? 0;
  const commentsReceived = useMemo(() => {
    return myPosts.reduce((sum, p) => sum + (p.data.commentCount ?? 0), 0);
  }, [myPosts]);

  const currentAvatar = avatarPreview || userDoc?.avatarUrl;

  async function uploadNewAvatarIfNeeded(): Promise<{ url?: string; storagePath?: string } | null> {
    if (!avatarFile || !uid) return null;
    const hint = getFirebaseStorageBucketTroubleshootingMessage();
    if (hint) throw new Error(hint);
    if (!fileIsAllowedImage(avatarFile)) throw new Error("Invalid format. Use JPG or PNG.");
    if (avatarFile.size > 5 * 1024 * 1024) throw new Error("File too large (max 5MB).");

    setUploadingAvatar(true);
    try {
      const ext = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
      const storagePath = `profile-pictures/${uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, avatarFile, { contentType: avatarFile.type });
      const url = await getDownloadURL(storageRef);
      return { url, storagePath };
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function deleteOldAvatarIfPossible() {
    const oldPath = userDoc?.avatarStoragePath;
    if (!oldPath) return;
    try {
      await deleteObject(ref(storage, oldPath));
    } catch {
      // ignore
    }
  }

  const onSave = async (data: EditForm) => {
    if (!user) return;
    if (!isFirebaseConfigured) {
      toast({ kind: "error", title: "Firebase not configured", description: "Add NEXT_PUBLIC_FIREBASE_* to .env.local." });
      return;
    }
    if (!userDoc) return;

    setSaving(true);
    setPermError(null);
    try {
      const firstName = data.firstName.trim();
      const lastName = data.lastName.trim();
      const emailLower = data.email.trim().toLowerCase();
      const countryCode = data.countryCode.trim();
      const phoneDigits = data.phoneNumber.replace(/\D/g, "").slice(0, 10);
      const fullPhoneNumber = `${countryCode}${phoneDigits}`;

      const sports = selectedSports(data.sportsInterests ?? {});
      const primarySport = sports[0] ?? userDoc.sportInterest ?? "Cricket";

      // email update (Auth + Firestore)
      if (emailLower && emailLower !== (user.email ?? "").toLowerCase()) {
        await checkEmailUniqueness(emailLower, user.email);
        if (emailStatus === "checking") throw new Error("Checking availability…");
        if (emailStatus === "taken") throw new Error("Email already taken");
        await updateEmail(user, emailLower);
      }

      const avatar = await uploadNewAvatarIfNeeded();
      if (avatar?.url && avatar?.storagePath) {
        await deleteOldAvatarIfPossible();
      }

      const patch: Partial<UserDoc> = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim() || userDoc.name,
        email: emailLower || userDoc.email,
        bio: (data.bio ?? "").trim().slice(0, 100) || undefined,
        location: (data.location ?? "").trim() || undefined,
        countryCode,
        phoneNumber: phoneDigits,
        fullPhoneNumber,
        phone: fullPhoneNumber,
        sportsInterests: sports,
        sportInterest: primarySport,
        goals: (data.goals ?? "").trim() || undefined,
        ...(avatar?.url ? { avatarUrl: avatar.url } : {}),
        ...(avatar?.storagePath ? { avatarStoragePath: avatar.storagePath } : {}),
      };

      await updateProfile(patch);
      toast({ kind: "success", title: "Saved", description: "Profile updated." });
      setTab("about");
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (e: any) {
      const text = e?.message ?? "Failed to save profile";
      toast({ kind: "error", title: "Save failed", description: text });
    } finally {
      setSaving(false);
    }
  };

  function cancelEdit() {
    if (hasUnsaved && !confirm("Discard unsaved changes?")) return;
    reset({
      firstName: userDoc?.firstName ?? "",
      lastName: userDoc?.lastName ?? "",
      bio: userDoc?.bio ?? "",
      location: userDoc?.location ?? "",
      email: (user?.email ?? userDoc?.email ?? "").toLowerCase(),
      countryCode: userDoc?.countryCode ?? "+1",
      phoneNumber: userDoc?.phoneNumber ?? "",
      sportsInterests: initSportsMap(userDoc),
      goals: userDoc?.goals ?? "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setTab("about");
  }

  if (loading) return <LoadingSpinner message="Loading your profile..." />;
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-slate-700">
          Please <Link className="underline font-semibold" href="/login">login</Link> to view your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Profile", onClick: () => router.push("/profile") },
          ]}
        />

        {permError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {permError}
          </div>
        )}

        {/* Header */}
        <Card>
          <CardBody>
            <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white">
              <div className="h-44 md:h-56 bg-gradient-to-r from-blue-500 to-indigo-600 relative">
                <div className="absolute right-4 top-4">
                  <Button variant="outline" type="button" disabled title="Coming soon">
                    <span className="inline-flex items-center gap-2">📷 <span>Edit Cover</span></span>
                  </Button>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="relative -mt-16 md:-mt-20 flex items-end justify-between gap-4">
                  <div className="flex items-end gap-4">
                    <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-white shadow-sm overflow-hidden bg-slate-100">
                      {currentAvatar ? (
                        <Image src={currentAvatar} alt="Profile photo" fill className="object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-slate-500 text-sm">No photo</div>
                      )}
                      <button
                        type="button"
                        className="absolute -right-1 -bottom-1 h-12 w-12 rounded-full bg-slate-950 text-white grid place-items-center border-4 border-white"
                        aria-label="Edit profile picture"
                        onClick={() => {
                          setTab("edit");
                          fileRef.current?.click();
                        }}
                        disabled={uploadingAvatar || saving}
                        title="Change photo"
                      >
                        {uploadingAvatar ? "…" : "📷"}
                      </button>
                    </div>

                    <div className="pb-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-950">
                          {(userDoc?.firstName || userDoc?.lastName)
                            ? `${userDoc?.firstName ?? ""} ${userDoc?.lastName ?? ""}`.trim()
                            : userDoc?.name ?? "Member"}
                        </div>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                          {isAdmin ? "Admin" : "Member"}
                        </span>
                        {userDoc?.status !== "approved" && (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                            Pending Approval
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-slate-600 space-y-1">
                        <div className="text-sm">{(userDoc?.bio ?? "").slice(0, 100) || "—"}</div>
                        <div className="text-sm flex flex-wrap gap-x-4 gap-y-1">
                          <span>📍 {userDoc?.location ?? "—"}</span>
                          <span>📅 Joined {joined}</span>
                          <span>✉️ {user.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pb-2">
                    <Button variant="dark" onClick={() => setTab("edit")}>
                      Edit Profile
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Stat title="Connections" value={connectionsCount} />
                  <Stat title="Posts" value={postsCount} />
                  <Stat title="Events" value={eventsCount} />
                  <Stat title="Likes" value={likesReceived} />
                  <Stat title="Comments" value={commentsReceived} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>Posts</TabButton>
          <TabButton active={tab === "about"} onClick={() => setTab("about")}>About</TabButton>
          <TabButton active={tab === "achievements"} onClick={() => setTab("achievements")}>Achievements</TabButton>
          <TabButton active={tab === "edit"} onClick={() => setTab("edit")}>Edit Profile</TabButton>
        </div>

        {tab === "posts" && (
          <div className="grid gap-6">
            {!isApproved ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Your account is pending admin approval. Posts will appear once you’re approved.
              </div>
            ) : myPosts.length === 0 ? (
              <div className="text-slate-600">No posts yet.</div>
            ) : (
              myPosts.map(({ id, data }) => (
                <PostCard
                  key={id}
                  postId={id}
                  post={data}
                  uid={uid}
                  canInteract={Boolean(isApproved && isFirebaseConfigured)}
                  isAdmin={isAdmin}
                />
              ))
            )}
          </div>
        )}

        {tab === "about" && (
          <Card>
            <CardHeader>
              <div className="font-extrabold tracking-tight text-lg">About</div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-4 text-sm text-slate-700">
                <div><span className="font-semibold">Email:</span> {user.email}</div>
                <div><span className="font-semibold">Phone:</span> {userDoc?.fullPhoneNumber ?? "—"}</div>
                <div><span className="font-semibold">Location:</span> {userDoc?.location ?? "—"}</div>
                <div>
                  <span className="font-semibold">Sports interests:</span>{" "}
                  {(userDoc?.sportsInterests?.length ? userDoc.sportsInterests : userDoc?.sportInterest ? [userDoc.sportInterest] : [])
                    .join(", ") || "—"}
                </div>
                <div><span className="font-semibold">Goals:</span> {userDoc?.goals ?? "—"}</div>
              </div>
            </CardBody>
          </Card>
        )}

        {tab === "achievements" && (
          <Card>
            <CardHeader>
              <div className="font-extrabold tracking-tight text-lg">Achievements</div>
              <div className="text-sm text-slate-600 mt-1">Badges and milestones (coming soon).</div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BadgeCard title="First Post" desc="Share your first update." />
                <BadgeCard title="Community Helper" desc="Comment on 10 posts." />
                <BadgeCard title="Event Regular" desc="Attend 5 events." />
              </div>
            </CardBody>
          </Card>
        )}

        {tab === "edit" && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-extrabold tracking-tight text-lg">Edit Profile</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {hasUnsaved ? "You have unsaved changes." : "Make updates and save when ready."}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={cancelEdit} disabled={saving || uploadingAvatar}>
                    Cancel
                  </Button>
                  <Button variant="dark" onClick={handleSubmit(onSave)} disabled={saving || uploadingAvatar}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {getFirebaseStorageBucketTroubleshootingMessage() && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {getFirebaseStorageBucketTroubleshootingMessage()}
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (!f) return;
                  if (!fileIsAllowedImage(f)) {
                    toast({ kind: "error", title: "Invalid format", description: "Use JPG or PNG." });
                    return;
                  }
                  if (f.size > 5 * 1024 * 1024) {
                    toast({ kind: "error", title: "File too large", description: "Max size is 5MB." });
                    return;
                  }
                  setAvatarFile(f);
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="First Name" error={errors.firstName?.message}>
                  <Input
                    className="bg-slate-100 border-slate-100"
                    {...register("firstName", {
                      required: "First name is required",
                      minLength: { value: 2, message: "First name must be at least 2 characters" },
                      validate: (v) => onlyLetters(v.trim()) || "First name must be at least 2 characters",
                    })}
                  />
                </Field>

                <Field label="Last Name" error={errors.lastName?.message}>
                  <Input
                    className="bg-slate-100 border-slate-100"
                    {...register("lastName", {
                      required: "Last name is required",
                      minLength: { value: 2, message: "Last name must be at least 2 characters" },
                      validate: (v) => onlyLetters(v.trim()) || "Last name must be at least 2 characters",
                    })}
                  />
                </Field>

                <Field label={`Bio (${wBio.length}/100)`} error={errors.bio?.message} className="md:col-span-2">
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
                    maxLength={100}
                    {...register("bio")}
                  />
                </Field>

                <Field label="Location" error={errors.location?.message}>
                  <Input className="bg-slate-100 border-slate-100" {...register("location")} />
                </Field>

                <Field label="Email" error={errors.email?.message}>
                  <div className="grid gap-1">
                    <Input
                      className="bg-slate-100 border-slate-100"
                      type="email"
                      {...register("email", {
                        required: "Email is required",
                        setValueAs: (v) => String(v ?? "").toLowerCase(),
                        onBlur: async (e) => {
                          if (!user) return;
                          await checkEmailUniqueness(String(e.target.value ?? "").toLowerCase(), user.email);
                        },
                      })}
                    />
                    <div className="flex items-center gap-2 text-xs">
                      {emailStatus === "checking" && <span className="text-slate-500">Checking availability…</span>}
                      {emailStatus === "available" && <span className="text-emerald-700 font-semibold">✓ Available</span>}
                      {emailStatus === "taken" && <span className="text-rose-700 font-semibold">✕ Taken</span>}
                    </div>
                  </div>
                </Field>

                <Field label="Country Code" error={errors.countryCode?.message}>
                  <Select className="bg-slate-100 border-slate-100" {...register("countryCode", { required: "Required" })}>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Phone Number" error={errors.phoneNumber?.message}>
                  <Input
                    className="bg-slate-100 border-slate-100"
                    placeholder="(555) 123-4567"
                    value={formatPhone(wPhoneDigits)}
                    onChange={(e) => setValue("phoneNumber", e.target.value, { shouldValidate: true })}
                    onBlur={() =>
                      setValue("phoneNumber", (wPhoneDigits || "").replace(/\D/g, "").slice(0, 10), {
                        shouldValidate: true,
                      })
                    }
                  />
                  <input type="hidden" {...register("phoneNumber")} />
                </Field>

                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Sports Interests</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SPORT_OPTIONS.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(wSportsMap?.[s])}
                          onChange={(e) =>
                            setValue(`sportsInterests.${s}` as any, e.target.checked, { shouldDirty: true })
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>

                <Field label="Personal Goals" className="md:col-span-2">
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary min-h-24"
                    placeholder="Your goals..."
                    {...register("goals")}
                  />
                </Field>

                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-slate-900 mb-2">Profile Picture</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" type="button" onClick={() => fileRef.current?.click()} disabled={saving || uploadingAvatar}>
                      Choose image
                    </Button>
                    <div className="text-xs text-slate-600">JPG/PNG, max 5MB</div>
                    {avatarPreview && (
                      <div className="relative h-20 w-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                        <Image src={avatarPreview} alt="New avatar preview" fill className="object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-2xl border text-sm font-semibold transition",
        active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold text-slate-500">{title}</div>
      <div className="text-xl font-extrabold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["grid gap-2", className].join(" ")}>
      <div className="text-sm font-semibold text-slate-900">{label}</div>
      {children}
      {error && <div className="text-sm text-rose-700">{error}</div>}
    </div>
  );
}

function BadgeCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="font-extrabold text-slate-900">{title}</div>
      <div className="text-sm text-slate-600 mt-1">{desc}</div>
      <div className="mt-3 text-xs text-slate-500">Coming soon</div>
    </div>
  );
}

