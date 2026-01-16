"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastCtx = {
  toast: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const next: Toast = { id, ...t };
      setToasts((prev) => [next, ...prev].slice(0, 4));
      window.setTimeout(() => remove(id), t.kind === "error" ? 6000 : 3500);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed right-4 top-[84px] z-[100] grid gap-2 w-[360px] max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border shadow-sm bg-white px-4 py-3",
              t.kind === "success"
                ? "border-emerald-200"
                : t.kind === "error"
                ? "border-rose-200"
                : "border-slate-200",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{t.title}</div>
                {t.description && <div className="mt-1 text-sm text-slate-600">{t.description}</div>}
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600"
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

