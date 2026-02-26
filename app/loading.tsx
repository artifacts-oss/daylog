import Loader from '@/components/Loader';

export default function Loading() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-500">
      <Loader caption="Loading your workspace..." />
    </div>
  );
}
