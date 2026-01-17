"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className={[
          "relative z-[201] w-full rounded-3xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[85vh]",
          maxWidthClassName,
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="text-xl font-extrabold tracking-tight">{title}</div>
          <button
            type="button"
            className="h-10 w-10 rounded-2xl hover:bg-slate-50 border border-slate-200"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5 overflow-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

