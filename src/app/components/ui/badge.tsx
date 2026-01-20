"use client";

import React from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export function Badge({
  children,
  variant = "secondary",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive";
  className?: string;
}) {
  const styles =
    variant === "default"
      ? "bg-slate-900 text-white border-slate-900"
      : variant === "destructive"
      ? "bg-rose-600 text-white border-rose-600"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        styles,
        className
      )}
    >
      {children}
    </span>
  );
}

