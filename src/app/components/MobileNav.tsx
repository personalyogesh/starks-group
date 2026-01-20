"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Home,
  PlusSquare,
  Search,
  User,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";

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

  return (
    <>
      {/* Bottom nav (authenticated only) */}
      {authed && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 z-[250] dark:bg-slate-950/80 dark:border-slate-800"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Bottom navigation"
        >
          <div className="flex items-center justify-around h-16 px-2">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href || (item.href.startsWith("/dashboard") && pathname === "/dashboard");
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  className={[
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition",
                    isActive
                      ? "text-blue-700 dark:text-brand-gold"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
                  ].join(" ")}
                >
                  {item.label === "Profile" ? (
                    <Avatar className={["size-7", isActive ? "ring-2 ring-blue-600 dark:ring-brand-gold" : ""].join(" ")}>
                      {currentUser?.userDoc?.avatarUrl ? (
                        <AvatarImage src={currentUser.userDoc.avatarUrl} alt={currentUser.userDoc.name ?? "Profile"} />
                      ) : (
                        <AvatarFallback className="text-xs">
                          {(currentUser?.userDoc?.name || currentUser?.authUser?.email || "U")
                            .trim()
                            .slice(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  ) : (
                    item.icon
                  )}
                  <span className={["text-[11px] font-semibold", isActive ? "text-blue-700 dark:text-brand-gold" : ""].join(" ")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}

