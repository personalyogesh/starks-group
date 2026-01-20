"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";

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

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppShell =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/create-post" ||
    pathname === "/events" ||
    pathname.startsWith("/members/") ||
    pathname === "/members" ||
    pathname === "/profile" ||
    pathname === "/notifications" ||
    pathname === "/settings" ||
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

