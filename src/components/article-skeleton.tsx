export function ArticleSkeleton({ variant = "default" }: { variant?: "default" | "hero" | "compact" }) {
  if (variant === "hero") {
    return (
      <div className="border border-border bg-surface overflow-hidden">
        <div className="aspect-[16/10] skeleton" />
        <div className="p-5 space-y-3">
          <div className="h-7 w-3/4 skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-2/3 skeleton" />
        </div>
      </div>
    );
  }
  if (variant === "compact") {
    return (
      <div className="flex gap-3 py-3 border-b border-border">
        <div className="h-20 w-20 shrink-0 skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-2/3 skeleton" />
        </div>
      </div>
    );
  }
  return (
    <div className="border border-border bg-surface overflow-hidden">
      <div className="aspect-[16/9] skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-1/3 skeleton" />
        <div className="h-5 w-full skeleton" />
        <div className="h-5 w-2/3 skeleton" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-6">
      <ArticleSkeleton variant="hero" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ArticleSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
