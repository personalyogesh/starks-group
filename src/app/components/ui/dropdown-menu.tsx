"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
};

const DropdownCtx = createContext<Ctx | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (triggerRef.current?.contains(t)) return;
      // Clicks inside content will stop propagation in DropdownMenuContent.
      setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const value = useMemo<Ctx>(() => ({ open, setOpen, triggerRef }), [open]);

  return <DropdownCtx.Provider value={value}>{children}</DropdownCtx.Provider>;
}

export function DropdownMenuTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<any>;
}) {
  const ctx = useContext(DropdownCtx);
  if (!ctx) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  const child = React.Children.only(children);

  const onClick = (e: React.MouseEvent) => {
    (child as any).props?.onClick?.(e);
    ctx.setOpen(!ctx.open);
  };

  const refSetter = (node: HTMLElement | null) => {
    ctx.triggerRef.current = node;
    const r = (child as any).ref;
    if (typeof r === "function") r(node);
    else if (r && typeof r === "object") r.current = node;
  };

  if (asChild) {
    return React.cloneElement(child, {
      ref: refSetter,
      onClick,
      "aria-haspopup": "menu",
      "aria-expanded": ctx.open,
    });
  }

  return (
    <button ref={refSetter as any} type="button" onClick={onClick} aria-haspopup="menu" aria-expanded={ctx.open}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  className,
  align = "start",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  const ctx = useContext(DropdownCtx);
  if (!ctx) throw new Error("DropdownMenuContent must be used within DropdownMenu");
  if (!ctx.open) return null;

  return (
    <div
      className={cn(
        "absolute mt-2 z-50 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      role="menu"
      onPointerDown={(e) => {
        // Prevent the window listener from closing when clicking inside content.
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const ctx = useContext(DropdownCtx);
  if (!ctx) throw new Error("DropdownMenuItem must be used within DropdownMenu");
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "w-full text-left px-3 py-2 text-sm flex items-center rounded-md hover:bg-gray-100 transition",
        className
      )}
      onClick={() => {
        onClick?.();
        ctx.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-slate-100 my-1" />;
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2 text-xs font-semibold text-slate-500">{children}</div>;
}

