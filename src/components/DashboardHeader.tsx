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

function initialsFromName(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function isActiveTopNav(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  if (href === "/partners") return pathname === "/partners" || pathname.startsWith("/partners/");
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
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:bg-slate-950 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-[72px] flex items-center gap-4">
          {/* Brand */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            aria-label="Go to home"
            className="flex items-center gap-3 min-w-[220px] hover:opacity-80 transition-opacity"
          >
            <Image
              src={logo}
              alt="Starks Cricket"
              width={36}
              height={36}
              className="rounded-full ring-1 ring-slate-200"
            />
            <div className="leading-tight">
              <div className="font-extrabold text-lg tracking-tight text-brand-deep dark:text-slate-100">
                Starks Cricket
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Estd. 2018</div>
            </div>
          </Link>

          {/* Desktop nav (lg+) */}
          <nav className="hidden lg:flex items-center gap-2">
            <Link
              href="/dashboard"
              aria-current={isActiveTopNav(pathname, "/dashboard") ? "page" : undefined}
              className={[
                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                isActiveTopNav(pathname, "/dashboard")
                  ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              Community
            </Link>
            <Link
              href="/partners"
              aria-current={isActiveTopNav(pathname, "/partners") ? "page" : undefined}
              className={[
                "rounded-xl px-3 py-2 text-sm font-semibold transition",
                isActiveTopNav(pathname, "/partners")
                  ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
              ].join(" ")}
            >
              Partners
            </Link>
          </nav>

          {/* Search (tablet+), hidden on mobile */}
          {isAuthenticated && (
            <div className="flex-1 hidden sm:block">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M16.2 16.2 21 21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
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

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <MobileNav isAuthenticated={isAuthenticated} />
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {isAuthenticated && (
              <>
                {/* Mobile: search toggle */}
                <button
                  type="button"
                  className="sm:hidden relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center"
                  aria-label="Search"
                  onClick={() => setMobileSearchOpen((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none">
                    <path
                      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M16.2 16.2 21 21"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  className="hidden sm:grid relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition place-items-center"
                  aria-label="Notifications"
                  onClick={() =>
                    toast({
                      kind: "info",
                      title: "Notifications",
                      description: "Notifications are coming soon.",
                    })
                  }
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-700" fill="none">
                    <path
                      d="M12 22a2.2 2.2 0 0 0 2.2-2.2H9.8A2.2 2.2 0 0 0 12 22Z"
                      fill="currentColor"
                    />
                    <path
                      d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                </button>
              </>
            )}

            {currentUser ? (
              <div className="relative">
                <UserAccountMenu
                  user={{
                    name: String(displayName),
                    email: currentUser.authUser.email ?? "",
                    avatar: currentUser.userDoc?.avatarUrl,
                    role: currentUser.userDoc?.role,
                  }}
                  notificationCount={0}
                  onNavigate={(page) => {
                    if (page === "profile" || page === "edit-profile" || page === "settings") {
                      router.push("/profile");
                      return;
                    }
                    if (page === "create-post") {
                      router.push("/create-post");
                      return;
                    }
                    if (page === "notifications") {
                      router.push("/dashboard");
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
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button size="sm" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" variant="dark">
                    Join
                  </Button>
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <div className="hidden sm:block">
                <Link href="/profile">
                  <Button size="sm" variant="outline">
                    Edit Profile
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

