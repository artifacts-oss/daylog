import PageSkeleton from '@/components/PageSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

// Varied heights mimic the masonry layout.
const heights = ['h-48', 'h-64', 'h-40', 'h-56', 'h-44', 'h-60'];

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="masonry-container gap-6">
        {heights.map((height, i) => (
          <div key={i} className="masonry-item mb-6">
            <Skeleton className={`w-full rounded-[20px] ${height}`} />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
