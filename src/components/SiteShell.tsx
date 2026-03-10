"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthProvider } from "@/lib/AuthContext";
import { useAuth } from "@/lib/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Container from "@/components/ui/Container";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { GlobalErrorReporter } from "@/app/components/GlobalErrorReporter";

function AuthStatusIndicator({ pathname }: { pathname: string }) {
  const { currentUser } = useAuth();
  const showAuthIndicator = process.env.NODE_ENV !== "production" && pathname !== "/";
  if (!showAuthIndicator) return null;

  return (
    <div className="fixed bottom-8 left-8 z-50 px-4 py-2 bg-slate-950 text-white rounded-full shadow-lg text-sm">
      {currentUser
        ? `✓ Logged in as ${
            currentUser.userDoc?.firstName || currentUser.userDoc?.name || currentUser.authUser.email || "User"
          }`
        : "○ Browsing as guest"}
    </div>
  );
}

function AppShellMain({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const padForBottomNav = Boolean(currentUser);
  return <main className={["flex-1", padForBottomNav ? "pb-20 md:pb-0" : ""].join(" ")}>{children}</main>;
}

function BirthdayReminderBanner({ pathname }: { pathname: string }) {
  const { currentUser } = useAuth();
  const userDoc = currentUser?.userDoc ?? null;
  const isMissingBirthday = Boolean(currentUser && (!userDoc?.birthMonth || !userDoc?.birthDay));
  const [showPromptCard, setShowPromptCard] = useState(false);

  useEffect(() => {
    if (!isMissingBirthday || pathname === "/profile") {
      setShowPromptCard(false);
      return;
    }
    const dismissKey = `starks:birthdayReminderDismissed:${currentUser?.authUser.uid ?? "guest"}`;
    const dismissedAt = typeof window !== "undefined" ? window.localStorage.getItem(dismissKey) : null;
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const shouldShowCard = !dismissedAt || now - Number(dismissedAt) > oneDayMs;
    setShowPromptCard(shouldShowCard);
  }, [isMissingBirthday, pathname, currentUser?.authUser.uid]);

  if (!isMissingBirthday || pathname === "/profile") return null;

  const dismissPromptCard = () => {
    const dismissKey = `starks:birthdayReminderDismissed:${currentUser?.authUser.uid ?? "guest"}`;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey, String(Date.now()));
    }
    setShowPromptCard(false);
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>Add your birthday month and day so Starks can celebrate you on the home page.</div>
          <div>
            <Link
              href="/profile"
              className="inline-flex items-center rounded-xl border border-amber-300 bg-white px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100"
            >
              Complete Birthday Info
            </Link>
          </div>
        </div>

        {showPromptCard && (
          <div className="rounded-2xl border border-amber-300 bg-white px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <div className="text-sm font-extrabold uppercase tracking-[0.14em] text-amber-700">
                  Profile Update Needed
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  Add your birthday so we can celebrate you automatically.
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  It only takes a moment. Open your profile, choose your birth month and birth day, and save once.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
                >
                  Update Profile
                </Link>
                <button
                  type="button"
                  onClick={dismissPromptCard}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Remind Me Tomorrow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppShell =
    pathname === "/community" ||
    pathname.startsWith("/community/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/create-post" ||
    pathname === "/events" ||
    pathname.startsWith("/members/") ||
    pathname === "/members" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname === "/settings" ||
    pathname === "/payments" ||
    pathname === "/videos" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="bg-brand-bg text-slate-900 min-h-screen bg-stadium-glow flex flex-col dark:bg-[#0b1220] dark:text-slate-100">
          {isAppShell ? (
            <Suspense fallback={<div className="h-[72px] border-b border-slate-200 bg-white" />}>
              <DashboardHeader />
            </Suspense>
          ) : (
            <Navbar />
          )}

          <BirthdayReminderBanner pathname={pathname} />

          {isAppShell ? (
            <AppShellMain>{children}</AppShellMain>
          ) : (
            <>
              <main className="py-8 flex-1">
                <Container>{children}</Container>
              </main>
              <Footer />
            </>
          )}
          <AuthStatusIndicator pathname={pathname} />
          <GlobalErrorReporter />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

