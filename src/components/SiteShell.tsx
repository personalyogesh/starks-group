"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { AuthProvider } from "@/lib/AuthContext";
import DashboardHeader from "@/components/DashboardHeader";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Container from "@/components/ui/Container";
import { ToastProvider } from "@/components/ui/ToastProvider";

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
    pathname === "/videos";

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="bg-brand-bg text-slate-900 min-h-screen bg-stadium-glow flex flex-col">
          {isAppShell ? (
            <Suspense fallback={<div className="h-[72px] border-b border-slate-200 bg-white" />}>
              <DashboardHeader />
            </Suspense>
          ) : (
            <Navbar />
          )}

          {isAppShell ? (
            <main className="flex-1">{children}</main>
          ) : (
            <>
              <main className="py-8 flex-1">
                <Container>{children}</Container>
              </main>
              <Footer />
            </>
          )}
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}

