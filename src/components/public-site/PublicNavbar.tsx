"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import logo from "@/assets/starks-logo.jpg";
import { PUBLIC_NAV, PUBLIC_SITE } from "@/content/publicSite";
import { PublicThemeToggle } from "@/components/public-site/PublicThemeToggle";
import Container from "@/components/ui/Container";

const navLinkClass =
  "rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:text-slate-200 dark:hover:bg-slate-800";

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
  <>
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <Container>
        <div className="flex items-center gap-3 py-3 min-h-[64px]">
          <Link href="/" className="flex items-center gap-3 min-w-0" aria-label="Starks Cricket home">
            <Image
              src={logo}
              alt=""
              width={44}
              height={44}
              className="rounded-full ring-2 ring-brand-gold/40 shrink-0"
              priority
            />
            <div className="leading-tight min-w-0">
              <div className="font-extrabold text-base sm:text-lg tracking-tight text-brand-deep dark:text-slate-100 truncate">
                {PUBLIC_SITE.clubName}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Estd. {PUBLIC_SITE.established}</div>
            </div>
          </Link>

          <nav className="hidden md:flex flex-1 justify-center gap-1" aria-label="Primary">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <PublicThemeToggle />
            <button
            type="button"
            className="md:hidden inline-flex items-center justify-center size-11 rounded-xl border border-slate-200 bg-white text-brand-deep dark:border-slate-700 dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-expanded={open}
            aria-controls="public-mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
          </div>
        </div>
      </Container>
    </header>

    {open ? (
      <div
        id="public-mobile-menu"
        className="fixed inset-0 z-[60] md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/50"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
        <MobileMenuPanel>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-brand-deep dark:text-slate-100">Menu</span>
            <button
              type="button"
              className="size-10 rounded-lg border border-slate-200 flex items-center justify-center"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>
          <nav className="p-3 flex flex-col gap-1" aria-label="Mobile primary">
            {PUBLIC_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-base font-semibold text-slate-800 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center rounded-xl bg-brand-primary px-4 py-3.5 text-base font-bold text-white min-h-[48px]"
            >
              Contact the club
            </Link>
          </div>
        </MobileMenuPanel>
      </div>
    ) : null}
  </>
  );
}

function MobileMenuPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute right-0 top-0 h-full w-[min(100%,20rem)] bg-white shadow-xl dark:bg-slate-950 flex flex-col">
      {children}
    </div>
  );
}
