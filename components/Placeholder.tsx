import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PlaceholderProps = {
  simple?: boolean;
  background?: boolean;
  className?: string;
};

export default function Placeholder({
  simple = false,
  background = false,
  className = '',
}: PlaceholderProps) {
  return background ? (
    <div className={cn('rounded-lg overflow-hidden', className)}>
      <Skeleton className="aspect-[21/9] w-full" />
    </div>
  ) : (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      <Skeleton className="aspect-[21/9] w-full" />
      <div className="p-4 space-y-3">
        {simple ? (
          <Skeleton className="h-4 w-3/4" />
        ) : (
          <>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <div className="flex justify-between pt-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
