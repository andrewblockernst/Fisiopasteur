"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Skeleton — placeholder animado para estados de carga.
 *
 * Primitiva:
 * ```tsx
 * <Skeleton className="h-10 w-full" />
 * ```
 *
 * Composiciones (Skeleton.Card, Skeleton.List, Skeleton.Form, Skeleton.Table)
 * cubren los layouts más comunes. Si tu layout es distinto, componer con la
 * primitiva.
 */

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    aria-hidden="true"
    className={cn("animate-pulse rounded-md bg-muted", className)}
    {...props}
  />
)) as React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
> & {
  Card: typeof SkeletonCard;
  List: typeof SkeletonList;
  Form: typeof SkeletonForm;
  Table: typeof SkeletonTable;
};
(Skeleton as React.ForwardRefExoticComponent<any>).displayName = "Skeleton";

const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "rounded-lg border border-border bg-card p-4 sm:p-6 space-y-3",
      className,
    )}
  >
    <Skeleton className="h-5 w-1/3" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const SkeletonList: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className,
}) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
      >
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

const SkeletonForm: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className,
}) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-1.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <Skeleton className="h-10 w-32" />
  </div>
);

const SkeletonTable: React.FC<{
  rows?: number;
  cols?: number;
  className?: string;
}> = ({ rows = 5, cols = 4, className }) => (
  <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
    {/* Header */}
    <div className="grid bg-muted/40 border-b border-border p-3 gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-2/3" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="grid p-3 gap-3 border-b border-border last:border-b-0"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-4 w-full" />
        ))}
      </div>
    ))}
  </div>
);

(Skeleton as any).Card = SkeletonCard;
(Skeleton as any).List = SkeletonList;
(Skeleton as any).Form = SkeletonForm;
(Skeleton as any).Table = SkeletonTable;

export { Skeleton, SkeletonCard, SkeletonList, SkeletonForm, SkeletonTable };
