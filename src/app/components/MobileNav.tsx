"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Home,
  Menu,
  PlusSquare,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { ThemeToggle } from "@/app/components/ThemeToggle";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
};

function isActivePath(currentPathname: string, href: string) {
  // Normalize common “section” routes so subpages highlight the parent.
  if (href === "/") return currentPathname === "/";
  if (href === "/dashboard") return currentPathname === "/dashboard" || currentPathname.startsWith("/dashboard/");
  if (href === "/members") return currentPathname === "/members" || currentPathname.startsWith("/members/");
  if (href === "/events") return currentPathname === "/events" || currentPathname.startsWith("/events/");
  if (href === "/videos") return currentPathname === "/videos" || currentPathname.startsWith("/videos/");
  if (href === "/partners") return currentPathname === "/partners" || currentPathname.startsWith("/partners/");
  if (href === "/admin") return currentPathname === "/admin" || currentPathname.startsWith("/admin/");
  return currentPathname === href;
}

export function MobileNav({
  isAuthenticated,
}: {
  isAuthenticated?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout } = useAuth();

  const authed = isAuthenticated ?? Boolean(currentUser);
  const isAdmin = currentUser?.userDoc?.role === "admin";

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const bottomItems = useMemo(
    () =>
      [
        { label: "Home", href: "/dashboard", icon: <Home className="size-6" /> },
        { label: "Search", href: "/dashboard?mobileSearch=1", icon: <Search className="size-6" /> },
        { label: "Create", href: "/create-post", icon: <PlusSquare className="size-6" /> },
        { label: "Notifications", href: "/dashboard", icon: <Bell className="size-6" /> },
        { label: "Profile", href: "/profile", icon: <User className="size-6" /> },
      ] satisfies NavItem[],
    []
  );

  const drawerItems = useMemo(() => {
    const items: NavItem[] = [
      { label: "Home", href: "/", icon: <Home className="size-5" /> },
      { label: "Community", href: "/dashboard", icon: <Users className="size-5" /> },
      { label: "Events", href: "/events", icon: <Users className="size-5" /> },
      { label: "Members", href: "/members", icon: <Users className="size-5" /> },
      { label: "Partners", href: "/partners", icon: <Users className="size-5" /> },
      { label: "Videos", href: "/videos", icon: <Users className="size-5" /> },
      { label: "Create Post", href: "/create-post", icon: <PlusSquare className="size-5" />, requireAuth: true },
      { label: "Profile", href: "/profile", icon: <User className="size-5" />, requireAuth: true },
      { label: "Admin", href: "/admin", icon: <Users className="size-5" />, requireAuth: true, adminOnly: true },
    ];
    return items.filter((i) => {
      if (i.adminOnly && !isAdmin) return false;
      if (i.requireAuth && !authed) return false;
      return true;
    });
  }, [authed, isAdmin]);

  return (
    <>
      {/* Hamburger trigger (place in header) */}
      <button
        type="button"
        className="md:hidden relative h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition grid place-items-center dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        aria-label="Open menu"
        onClick={() => setDrawerOpen(true)}
      >
        <Menu className="size-6 text-slate-800 dark:text-slate-100" />
      </button>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[300] md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white shadow-xl border-r border-slate-200 p-4 flex flex-col dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-slate-950 dark:text-slate-100">Menu</div>
              <button
                type="button"
                aria-label="Close menu"
                className="h-10 w-10 rounded-2xl hover:bg-slate-50 border border-slate-200 grid place-items-center dark:border-slate-700 dark:hover:bg-slate-800"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="size-5 text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            <div className="mt-4 grid gap-1">
              {drawerItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                  className={[
                    "rounded-2xl px-3 py-3 transition flex items-center gap-3 font-semibold",
                    isActivePath(pathname, item.href)
                      ? "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "hover:bg-slate-50 text-slate-800 dark:hover:bg-slate-800 dark:text-slate-100",
                  ].join(" ")}
                >
                  <span
                    className={
                      isActivePath(pathname, item.href) ? "text-white dark:text-slate-900" : "text-slate-700 dark:text-slate-200"
                    }
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Theme</div>
                <ThemeToggle />
              </div>
              {authed ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await logout();
                    router.push("/");
                  }}
                >
                  Logout
                </Button>
              ) : (
                <div className="grid gap-2">
                  <Link href="/login">
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="dark" className="w-full">
                      Join Us
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav (authenticated only) */}
      {authed && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-[250] dark:bg-slate-950/80 dark:border-slate-800"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Bottom navigation"
        >
          <div className="flex items-center justify-around h-16">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href || (item.href.startsWith("/dashboard") && pathname === "/dashboard");
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  className={[
                    "h-12 w-12 rounded-2xl grid place-items-center transition",
                    isActive
                      ? "text-brand-primary bg-slate-50 dark:bg-slate-800 dark:text-brand-gold"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                  ].join(" ")}
                >
                  {item.icon}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

