export default function Loader({ caption }: { caption: string }) {
  return (
    <div className="flex w-full justify-center py-8">
      <div className="text-center space-y-3">
        <div className="text-muted-foreground text-sm">{caption}</div>
        <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      </div>
    </div>
  );
}
