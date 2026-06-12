import { Skeleton } from '@/components/ui/skeleton';

function SectionHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
      {withAction && <Skeleton className="h-8 w-24 rounded-full" />}
    </div>
  );
}

export function BoardsSkeleton() {
  return (
    <section className="space-y-6">
      <SectionHeaderSkeleton withAction />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2.5/1] rounded-2xl" />
        ))}
      </div>
    </section>
  );
}

export function NotesSkeleton() {
  // Varied heights to mimic the masonry layout and avoid layout shift.
  const heights = ['h-48', 'h-64', 'h-40', 'h-56', 'h-44', 'h-60'];

  return (
    <section className="space-y-6">
      <SectionHeaderSkeleton />
      <div className="masonry-container space-y-4">
        {heights.map((height, i) => (
          <div key={i} className="masonry-item">
            <Skeleton className={`w-full rounded-2xl ${height}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
