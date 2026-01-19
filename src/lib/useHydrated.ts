"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client.
 * Useful to prevent SSR/client hydration mismatches for anything that depends on
 * local time, locale formatting, system theme, localStorage, etc.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

