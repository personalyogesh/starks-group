"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/app/components/ThemeProvider";
import { useHydrated } from "@/lib/useHydrated";

/** Compact theme control for the public shell (reuses existing ThemeProvider). */
export function PublicThemeToggle() {
  const { resolved, toggle } = useTheme();
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div
        className="size-11 rounded-xl border border-slate-200 dark:border-slate-700 opacity-0 pointer-events-none"
        aria-hidden
      />
    );
  }

  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-deep hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:ring-offset-slate-950"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
