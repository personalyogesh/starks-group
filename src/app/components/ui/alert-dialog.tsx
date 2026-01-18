"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type Ctx = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const AlertDialogCtx = createContext<Ctx | null>(null);

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(() => ({ open, onOpenChange }), [open, onOpenChange]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return <AlertDialogCtx.Provider value={value}>{children}</AlertDialogCtx.Provider>;
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const ctx = useContext(AlertDialogCtx);
  if (!ctx) throw new Error("AlertDialogContent must be used within AlertDialog");
  if (!ctx.open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center"
      aria-modal="true"
      role="dialog"
      onMouseDown={() => ctx.onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-[min(92vw,520px)] rounded-2xl border border-slate-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-5 pt-5">{children}</div>;
}

export function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("text-lg font-extrabold text-slate-950", className)}>{children}</div>;
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 text-sm text-slate-600">{children}</div>;
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-5 pb-5 pt-4 flex items-center justify-end gap-2">{children}</div>;
}

export function AlertDialogCancel({ children }: { children: React.ReactNode }) {
  const ctx = useContext(AlertDialogCtx);
  if (!ctx) throw new Error("AlertDialogCancel must be used within AlertDialog");
  return (
    <button
      type="button"
      className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium transition"
      onClick={() => ctx.onOpenChange(false)}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const ctx = useContext(AlertDialogCtx);
  if (!ctx) throw new Error("AlertDialogAction must be used within AlertDialog");
  return (
    <button
      type="button"
      className={cn(
        "px-4 py-2 rounded-xl text-white text-sm font-medium transition",
        "bg-slate-950 hover:bg-slate-900",
        className
      )}
      onClick={() => {
        onClick?.();
        // Let caller decide if they want to close; common behavior is to close.
        ctx.onOpenChange(false);
      }}
    >
      {children}
    </button>
  );
}

