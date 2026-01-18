"use client";

export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-b-brand-primary mb-4" />
      <p className="text-slate-600 text-sm font-semibold">{message}</p>
    </div>
  );
}

