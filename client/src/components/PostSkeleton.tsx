export default function PostSkeleton() {
  return (
    <div className="bg-card rounded-xl p-4 animate-pulse" data-testid="skeleton-post">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="flex-1 min-w-0">
          <div className="h-3 w-24 bg-muted rounded-full mb-1.5" />
          <div className="h-2.5 w-16 bg-muted rounded-full" />
        </div>
        <div className="h-5 w-14 bg-muted rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-muted rounded-full mb-2" />
      <div className="h-3 w-full bg-muted rounded-full mb-1.5" />
      <div className="h-3 w-2/3 bg-muted rounded-full mb-4" />
      <div className="flex items-center gap-2 flex-wrap">
        <div className="h-7 w-20 bg-muted rounded-full" />
        <div className="h-7 w-16 bg-muted rounded-full" />
        <div className="h-7 w-16 bg-muted rounded-full" />
        <div className="flex-1" />
        <div className="h-5 w-14 bg-muted rounded-full" />
      </div>
    </div>
  );
}
