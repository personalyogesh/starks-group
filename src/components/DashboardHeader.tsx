"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import logo from "@/assets/starks-logo.jpg";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import { UserAccountMenu } from "@/app/components/UserAccountMenu";
import { MobileNav } from "@/app/components/MobileNav";
import { useToast } from "@/components/ui/ToastProvider";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Award, Bell, DollarSign, Home, PlusCircle, Search } from "lucide-react";
import { MobileSidebar } from "@/app/components/MobileSidebar";

function initialsFromName(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function isActiveTopNav(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (href === "/partners") return pathname === "/partners" || pathname.startsWith("/partners/");
  if (href === "/payments") return pathname === "/payments" || pathname.startsWith("/payments/");
  return pathname === href;
}

export default function DashboardHeader() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const isAdmin = currentUser?.userDoc?.role === "admin";
  const isAuthenticated = Boolean(currentUser);
  const { toast } = useToast();

  const q = sp.get("q") ?? "";
  const [draft, setDraft] = useState(q);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // keep UI snappy: update local immediately, commit to URL on blur/enter
  const commit = (next: string) => {
    const nextSp = new URLSearchParams(sp.toString());
    if (next.trim()) nextSp.set("q", next.trim());
    else nextSp.delete("q");
    router.replace(`${pathname}?${nextSp.toString()}`);
  };

  const displayName = useMemo(() => {
    return (
      currentUser?.userDoc?.firstName ||
      currentUser?.userDoc?.name ||
      currentUser?.authUser?.email ||
      "You"
    );
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm dark:bg-slate-950 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Left: Logo + Primary nav */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => router.push(isAuthenticated ? "/dashboard" : "/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="Go to home"
            >
              <Image src={logo} alt="Starks Cricket" width={40} height={40} className="rounded-full ring-1 ring-slate-200" />
              <div className="hidden md:block leading-tight">
                <div className="text-xl font-extrabold tracking-tight text-brand-deep dark:text-slate-100">
                  Starks Cricket
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Estd. 2018</div>
              </div>
            </button>

            <nav className="hidden lg:flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  isActiveTopNav(pathname, "/dashboard")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                <Home className="size-4" />
                Community
              </button>
              <button
                type="button"
                onClick={() => router.push("/partners")}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  isActiveTopNav(pathname, "/partners")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                <Award className="size-4" />
                Partners
              </button>
              <button
                type="button"
                onClick={() => router.push("/payments")}
                className={[
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  isActiveTopNav(pathname, "/payments")
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                <DollarSign className="size-4" />
                Payments
              </button>
            </nav>
          </div>

          {/* Center: Search (authed) */}
          {isAuthenticated && (
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(draft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commit(draft);
                    }
                  }}
                  placeholder="Search posts, members, events..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <MobileSidebar
              isAuthenticated={isAuthenticated}
              userProfile={
                currentUser
                  ? {
                      displayName: currentUser.userDoc?.name || currentUser.authUser.email || "Member",
                      email: currentUser.authUser.email ?? "",
                      photoURL: currentUser.userDoc?.avatarUrl,
                      role: currentUser.userDoc?.role,
                      postsCount: currentUser.userDoc?.stats?.posts ?? 0,
                      likesReceived: currentUser.userDoc?.stats?.likes ?? 0,
                      eventsJoined: currentUser.userDoc?.stats?.events ?? 0,
                      unreadNotifications: 0,
                    }
                  : undefined
              }
              onNavigate={(page) => {
                if (page === "dashboard") return router.push("/dashboard");
                if (page === "members" || page === "community") return router.push("/members");
                if (page === "events") return router.push("/events");
                if (page === "videos") return router.push("/videos");
                if (page === "partners") return router.push("/partners");
                if (page === "payments") return router.push("/payments");
                if (page === "profile") return router.push("/profile");
                if (page === "settings") return router.push("/settings");
                if (page === "notifications") return router.push("/notifications");
                if (page === "admin" && isAdmin) return router.push("/admin");
                if (page === "help") return router.push("/#about");
                if (page === "about") return router.push("/#about");
                if (page === "contact") return router.push("/#about");
                if (page === "login") return router.push("/login");
                if (page === "register") return router.push("/register");
                // placeholders
                if (page === "liked" || page === "saved" || page === "history" || page === "analytics") {
                  toast({ kind: "info", title: "Coming soon", description: "This page will be available soon." });
                  return;
                }
              }}
              onLogout={logout}
            />
            <MobileNav isAuthenticated={isAuthenticated} />

            {isAuthenticated ? (
              <>
                <Button
                  size="sm"
                  variant="dark"
                  className="hidden sm:inline-flex"
                  onClick={() => router.push("/create-post")}
                >
                  <PlusCircle className="size-4 mr-2" />
                  Create
                </Button>

                <button
                  type="button"
                  className="hidden sm:grid relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition place-items-center dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  aria-label="Notifications"
                  onClick={() =>
                    toast({
                      kind: "info",
                      title: "Notifications",
                      description: "Notifications are coming soon.",
                    })
                  }
                >
                  <Bell className="size-5 text-slate-700 dark:text-slate-200" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                </button>

                {/* Theme toggle (icon only) */}
                <div className="hidden sm:block">
                  <ThemeToggle showSystemLink={false} />
                </div>

                <UserAccountMenu
                  user={{
                    name: String(displayName),
                    email: currentUser?.authUser.email ?? "",
                    avatar: currentUser?.userDoc?.avatarUrl,
                    role: currentUser?.userDoc?.role,
                  }}
                  notificationCount={0}
                  stats={{
                    posts: currentUser?.userDoc?.stats?.posts ?? 0,
                    likes: currentUser?.userDoc?.stats?.likes ?? 0,
                    events: currentUser?.userDoc?.stats?.events ?? 0,
                  }}
                  showNameInTrigger={false}
                  onNavigate={(page) => {
                    if (page === "profile" || page === "edit-profile") {
                      router.push("/profile");
                      return;
                    }
                    if (page === "settings") {
                      router.push("/settings");
                      return;
                    }
                    if (page === "create-post") {
                      router.push("/create-post");
                      return;
                    }
                    if (page === "notifications") {
                      router.push("/notifications");
                      return;
                    }
                    if (page === "help") {
                      router.push("/#about");
                      return;
                    }
                    if (page === "admin" && isAdmin) {
                      router.push("/admin");
                      return;
                    }
                  }}
                  onLogout={logout}
                />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="dark">
                    Join Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search (toggle) */}
        {isAuthenticated && mobileSearchOpen && (
          <div className="sm:hidden pb-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit(draft);
                  setMobileSearchOpen(false);
                }
              }}
              placeholder="Search posts, members, events..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
          </div>
        )}
      </div>
    </header>
  );
}

