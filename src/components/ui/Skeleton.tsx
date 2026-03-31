import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

/** Full-card skeleton for home page */
export function HomeCardSkeleton() {
  return (
    <div className="glass-strong rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4 rounded-xl" />
          <Skeleton className="h-3 w-1/2 rounded-lg" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full rounded-lg" />
        <Skeleton className="h-3 w-5/6 rounded-lg" />
        <Skeleton className="h-3 w-4/6 rounded-lg" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28 rounded-2xl" />
        <Skeleton className="h-10 w-20 rounded-2xl" />
      </div>
    </div>
  );
}

/** Dhikr card skeleton */
export function DhikrCardSkeleton() {
  return (
    <div className="glass-strong rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-9 h-9 rounded-2xl" />
        <Skeleton className="w-9 h-9 rounded-2xl" />
        <Skeleton className="w-9 h-9 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-5/6 rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-4/6 rounded-lg" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-14 rounded-lg" />
            <Skeleton className="h-4 w-10 rounded-lg" />
          </div>
        </div>
        <Skeleton className="w-9 h-9 rounded-2xl" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}

/** Quick stat skeleton */
export function StatSkeleton() {
  return (
    <div className="glass rounded-3xl p-4 border border-white/10">
      <Skeleton className="h-3 w-16 rounded-lg" />
      <Skeleton className="h-7 w-12 rounded-xl mt-2" />
    </div>
  );
}

/** Full-page loading skeleton */
export function PageSkeleton() {
  return (
    <div className="space-y-4 page-enter">
      <HomeCardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
      <HomeCardSkeleton />
    </div>
  );
}
