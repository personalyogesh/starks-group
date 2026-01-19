"use client";

import { Moon, Sun } from "lucide-react";
import Button from "@/components/ui/Button";
import { useTheme } from "@/app/components/ThemeProvider";
import { useHydrated } from "@/lib/useHydrated";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle, mode, setMode } = useTheme();
  const hydrated = useHydrated();

  // Prevent hydration mismatch: server doesn't know user's system preference/localStorage.
  // Render a stable placeholder until mounted.
  if (!hydrated) {
    return (
      <div className={["inline-flex items-center gap-2", className].join(" ")}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0 rounded-2xl grid place-items-center opacity-0 pointer-events-none"
          aria-hidden="true"
          tabIndex={-1}
        >
          <Moon className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={["inline-flex items-center gap-2", className].join(" ")}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 w-10 p-0 rounded-2xl grid place-items-center"
        aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={resolved === "dark" ? "Light mode" : "Dark mode"}
        onClick={toggle}
      >
        {resolved === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      {/* Optional: allow users to return to system default */}
      {mode !== "system" && (
        <button
          type="button"
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:underline"
          onClick={() => setMode("system")}
        >
          System
        </button>
      )}
    </div>
  );
}

