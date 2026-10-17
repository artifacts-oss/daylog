import { Skeleton } from '@/components/ui/skeleton';

export function SectionSkeleton({ className = 'h-32' }: { className?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className={`w-full rounded-[20px] ${className}`} />
    </section>
  );
}
