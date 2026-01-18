"use client";

import Card from "@/components/ui/Card";

function Skeleton({ className }: { className: string }) {
  return <div className={["animate-pulse rounded-md bg-slate-200/70", className].join(" ")} />;
}

export function PartnerCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="p-0">
        {/* Tier banner skeleton */}
        <Skeleton className="h-2 w-full" />

        {/* Logo skeleton */}
        <div className="aspect-square bg-slate-50 flex items-center justify-center p-8">
          <Skeleton className="h-32 w-32 rounded-xl" />
        </div>

        {/* Content skeleton */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-3 border-t border-slate-100">
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </Card>
  );
}

