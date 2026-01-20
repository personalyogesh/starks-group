"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { updateUserProfile } from "@/lib/firestore";
import { useToast } from "@/components/ui/ToastProvider";

import {
  ArrowLeft,
  Bell,
  Globe,
  Lock,
  Mail,
  Shield,
  Smartphone,
  User,
} from "lucide-react";

type Tab = "account" | "notifications" | "privacy" | "security";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        {description && <div className="text-sm text-slate-600">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-7 w-12 items-center rounded-full transition border",
          checked ? "bg-blue-600 border-blue-600" : "bg-slate-200 border-slate-300",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const user = currentUser?.authUser ?? null;
  const userDoc = currentUser?.userDoc ?? null;

  const [tab, setTab] = useState<Tab>("account");
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(() => {
    const p: any = (userDoc as any)?.preferences ?? {};
    return {
      notifications: {
        email: p?.notifications?.email ?? true,
        push: p?.notifications?.push ?? true,
        posts: p?.notifications?.posts ?? true,
        comments: p?.notifications?.comments ?? true,
        likes: p?.notifications?.likes ?? true,
        events: p?.notifications?.events ?? true,
        newsletter: p?.notifications?.newsletter ?? false,
      },
      privacy: {
        profilePublic: p?.privacy?.profilePublic ?? true,
        showEmail: p?.privacy?.showEmail ?? false,
        showPosts: p?.privacy?.showPosts ?? true,
        allowMessages: p?.privacy?.allowMessages ?? true,
      },
    };
  }, [userDoc]);

  const [notifications, setNotifications] = useState(defaults.notifications);
  const [privacy, setPrivacy] = useState(defaults.privacy);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <div className="text-2xl font-extrabold tracking-tight">Settings</div>
            <div className="text-sm text-slate-600 mt-1">Please log in to manage your settings.</div>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/login")}>
                Login
              </Button>
              <Button variant="dark" onClick={() => router.push("/register")}>
                Join
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  async function savePreferences() {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        preferences: { notifications, privacy } as any,
      } as any);
      toast({ kind: "success", title: "Saved", description: "Settings saved successfully." });
    } catch (e: any) {
      toast({ kind: "error", title: "Save failed", description: e?.message ?? "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  const tabButton = (id: Tab, label: string, Icon: any) => {
    const active = tab === id;
    return (
      <button
        type="button"
        onClick={() => setTab(id)}
        className={[
          "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
          active ? "bg-slate-950 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
        ].join(" ")}
      >
        <Icon className="size-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        <div className="text-xl font-extrabold tracking-tight text-slate-900">Settings</div>
        <div className="w-[88px]" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabButton("account", "Account", User)}
        {tabButton("notifications", "Notifications", Bell)}
        {tabButton("privacy", "Privacy", Lock)}
        {tabButton("security", "Security", Shield)}
      </div>

      {tab === "account" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="text-lg font-extrabold">Account Information</div>
              <div className="text-sm text-slate-600 mt-1">Manage your account details and preferences.</div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="size-5 text-blue-700" />
                    </div>
                    <div>
                      <div className="font-semibold">Name</div>
                      <div className="text-sm text-slate-600">{userDoc?.name ?? user.email}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push("/profile")}>
                    Edit
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Mail className="size-5 text-purple-700" />
                    </div>
                    <div>
                      <div className="font-semibold">Email</div>
                      <div className="text-sm text-slate-600">{user.email ?? "—"}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast({
                        kind: "info",
                        title: "Coming soon",
                        description: "Email change flow will be added soon.",
                      })
                    }
                  >
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Globe className="size-5 text-green-700" />
                    </div>
                    <div>
                      <div className="font-semibold">Language</div>
                      <div className="text-sm text-slate-600">English (US)</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast({
                        kind: "info",
                        title: "Coming soon",
                        description: "Language selection will be added soon.",
                      })
                    }
                  >
                    Change
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-rose-200 bg-rose-50">
            <CardHeader>
              <div className="text-lg font-extrabold text-rose-700">Danger Zone</div>
              <div className="text-sm text-rose-700/80 mt-1">Irreversible actions — proceed with caution.</div>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      kind: "info",
                      title: "Coming soon",
                      description: "Account deactivation will be implemented with admin tooling.",
                    })
                  }
                >
                  Deactivate Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      kind: "info",
                      title: "Coming soon",
                      description: "Account deletion will be implemented with admin tooling.",
                    })
                  }
                >
                  Delete Account
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="text-lg font-extrabold">Email Notifications</div>
              <div className="text-sm text-slate-600 mt-1">Choose what updates you receive.</div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <ToggleRow
                  label="Email Notifications"
                  description="Receive notifications via email"
                  checked={notifications.email}
                  onChange={(v) => setNotifications((p) => ({ ...p, email: v }))}
                />
                <ToggleRow
                  label="New Posts"
                  description="Get notified when someone posts"
                  checked={notifications.posts}
                  onChange={(v) => setNotifications((p) => ({ ...p, posts: v }))}
                />
                <ToggleRow
                  label="Comments"
                  description="When someone comments on your posts"
                  checked={notifications.comments}
                  onChange={(v) => setNotifications((p) => ({ ...p, comments: v }))}
                />
                <ToggleRow
                  label="Likes"
                  description="When someone likes your content"
                  checked={notifications.likes}
                  onChange={(v) => setNotifications((p) => ({ ...p, likes: v }))}
                />
                <ToggleRow
                  label="Events"
                  description="Event reminders and updates"
                  checked={notifications.events}
                  onChange={(v) => setNotifications((p) => ({ ...p, events: v }))}
                />
                <ToggleRow
                  label="Newsletter"
                  description="Monthly club newsletter"
                  checked={notifications.newsletter}
                  onChange={(v) => setNotifications((p) => ({ ...p, newsletter: v }))}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-lg font-extrabold">Push Notifications</div>
              <div className="text-sm text-slate-600 mt-1">Manage push notifications on this device.</div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <ToggleRow
                  label="Push Notifications"
                  description="Receive push notifications"
                  checked={notifications.push}
                  onChange={(v) => setNotifications((p) => ({ ...p, push: v }))}
                />
              </div>
            </CardBody>
          </Card>

          <Button variant="dark" className="w-full" disabled={saving} onClick={savePreferences}>
            {saving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </div>
      )}

      {tab === "privacy" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="text-lg font-extrabold">Profile Privacy</div>
              <div className="text-sm text-slate-600 mt-1">Control who can see your profile and posts.</div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <ToggleRow
                  label="Public Profile"
                  description="Anyone can view your profile"
                  checked={privacy.profilePublic}
                  onChange={(v) => setPrivacy((p) => ({ ...p, profilePublic: v }))}
                />
                <ToggleRow
                  label="Show Email"
                  description="Display email on profile"
                  checked={privacy.showEmail}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))}
                />
                <ToggleRow
                  label="Public Posts"
                  description="Anyone can see your posts"
                  checked={privacy.showPosts}
                  onChange={(v) => setPrivacy((p) => ({ ...p, showPosts: v }))}
                />
                <ToggleRow
                  label="Allow Messages"
                  description="Members can message you"
                  checked={privacy.allowMessages}
                  onChange={(v) => setPrivacy((p) => ({ ...p, allowMessages: v }))}
                />
              </div>
            </CardBody>
          </Card>

          <Button variant="dark" className="w-full" disabled={saving} onClick={savePreferences}>
            {saving ? "Saving..." : "Save Privacy Settings"}
          </Button>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="text-lg font-extrabold">Password & Security</div>
              <div className="text-sm text-slate-600 mt-1">Manage your password and security options.</div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Lock className="size-5 text-blue-700" />
                  </div>
                  <div>
                    <div className="font-semibold">Password</div>
                    <div className="text-sm text-slate-600">Reset via email (coming soon)</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast({
                      kind: "info",
                      title: "Coming soon",
                      description: "Password reset shortcut will be added soon.",
                    })
                  }
                >
                  Change
                </Button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Smartphone className="size-5 text-emerald-700" />
                  </div>
                  <div>
                    <div className="font-semibold">Two-Factor Authentication</div>
                    <div className="text-sm text-slate-600">Not enabled</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast({
                      kind: "info",
                      title: "Coming soon",
                      description: "2FA will be added later.",
                    })
                  }
                >
                  Enable
                </Button>
              </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="text-lg font-extrabold">Active Sessions</div>
              <div className="text-sm text-slate-600 mt-1">Manage where you’re logged in.</div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Smartphone className="size-5 text-blue-700" />
                  </div>
                  <div>
                    <div className="font-semibold">Current Device</div>
                    <div className="text-sm text-slate-600">Active now</div>
                  </div>
                </div>
                <div className="text-xs font-semibold rounded-full border border-slate-200 bg-white px-2 py-1">
                  This device
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

