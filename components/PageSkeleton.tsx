import { Skeleton } from '@/components/ui/skeleton';
import { PropsWithChildren } from 'react';

// Mirrors PageHeader + PageBody spacing so the real page swaps in without layout shift.
export default function PageSkeleton({ children }: PropsWithChildren) {
  return (
    <div className="flex-1 overflow-y-auto" aria-busy="true">
      <div className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-10 space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
      </div>
      <div className="px-5 py-5 md:px-8 md:py-8">
        <div className="max-w-7xl mx-auto py-4">{children}</div>
      </div>
    </div>
  );
}
