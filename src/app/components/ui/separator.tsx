"use client";

export function Separator({ className }: { className?: string }) {
  return <div className={["h-px w-full bg-slate-100", className].filter(Boolean).join(" ")} />;
}

