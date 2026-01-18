"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const first = items[0];

  const home = first?.href ? (
    <Link
      href={first.href}
      aria-label="Go to home"
      className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-slate-100 transition"
    >
      <Home className="size-4 text-slate-700" />
    </Link>
  ) : (
    <button
      type="button"
      aria-label="Go to home"
      onClick={first?.onClick}
      className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-slate-100 transition"
    >
      <Home className="size-4 text-slate-700" />
    </button>
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className={[
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 mb-4",
        className ?? "",
      ].join(" ")}
    >
      {home}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            <ChevronRight className="size-4 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-900">{item.label}</span>
            ) : item.href ? (
              <Link href={item.href} className="hover:text-brand-primary transition-colors font-semibold">
                {item.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={item.onClick}
                className="hover:text-brand-primary transition-colors font-semibold"
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}

