"use client";

import React from "react";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export function Avatar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-slate-200",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AvatarImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return (
    // Use <img> for maximum compatibility (Firebase Storage URLs + iOS).
    <img
      src={src}
      alt={alt ?? ""}
      className={cn("h-full w-full object-cover", className)}
      referrerPolicy="no-referrer"
    />
  );
}

export function AvatarFallback({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("h-full w-full grid place-items-center text-slate-700 font-semibold", className)}>
      {children}
    </div>
  );
}

