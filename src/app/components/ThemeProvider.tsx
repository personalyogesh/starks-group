"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  applyResolvedTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
} from "@/lib/theme";

type ThemeCtx = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (raw === "light" || raw === "dark" || raw === "system") setModeState(raw);
    } catch {
      // ignore
    }
  }, []);

  const resolved = useMemo(() => resolveTheme(mode), [mode]);

  // Apply to <html> and keep in sync with OS changes when in system mode.
  useEffect(() => {
    applyResolvedTheme(resolved);

    if (mode !== "system") return;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => applyResolvedTheme(resolveTheme("system"));
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [mode, resolved]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const toggle = () => {
    // Toggle between light/dark explicitly
    setMode(resolved === "dark" ? "light" : "dark");
  };

  const value = useMemo<ThemeCtx>(() => ({ mode, resolved, setMode, toggle }), [mode, resolved]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}

