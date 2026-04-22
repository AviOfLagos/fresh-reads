import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { fetchNews } from "@/server/news";
import { CATEGORIES, type CategoryId } from "@/lib/news-types";
import { ArticleCard } from "@/components/article-card";
import { FeedSkeleton } from "@/components/article-skeleton";
import { ErrorState } from "@/components/error-state";
import { CategoryTabs } from "@/components/category-tabs";
import { cacheArticles, getAllCached } from "@/lib/article-cache";

const validCategoryIds = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

const searchSchema = z.object({
  category: fallback(z.enum(validCategoryIds), "general").default("general"),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  component: FeedPage,
});

function FeedPage() {
  const { category } = Route.useSearch();

  const query = useQuery({
    queryKey: ["news", "category", category],
    queryFn: async () => {
      const res = await fetchNews({ data: { category, max: 20, lang: "en" } });
      if (res.error) throw new Error(res.error);
      return res;
    },
  });

  useEffect(() => {
    if (query.data?.articles?.length) {
      cacheArticles(query.data.articles);
    }
  }, [query.data]);

  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "News";
  const articles = query.data?.articles ?? [];
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const fallbackCached = isOffline && query.isError ? getAllCached() : [];
  const showOfflineFallback = !!fallbackCached.length;

  return (
    <>
      <CategoryTabs active={category} />
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-1">
              Section
            </div>
            <h1 className="headline text-3xl md:text-4xl font-bold">{categoryLabel}</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-accent animate-pulse-dot" />
            {query.isFetching ? "Updating" : "Live"}
          </div>
        </div>

        {query.isLoading && <FeedSkeleton />}

        {query.isError && !showOfflineFallback && (
          <ErrorState
            message={query.error instanceof Error ? query.error.message : "Failed to load news"}
            onRetry={() => query.refetch()}
            icon={isOffline ? "offline" : "error"}
          />
        )}

        {showOfflineFallback && (
          <>
            <div className="mb-4 border border-border bg-surface px-4 py-3 ticker-text text-xs uppercase tracking-widest text-muted-foreground animate-fade-in">
              Showing cached articles · You are offline
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fallbackCached.slice(0, 12).map((a, i) => (
                <ArticleCard key={a.id} article={a} index={i} />
              ))}
            </div>
          </>
        )}

        {!query.isLoading && !query.isError && articles.length > 0 && (
          <div className="space-y-6">
            <ArticleCard article={articles[0]} variant="hero" index={0} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.slice(1, 10).map((a, i) => (
                <ArticleCard key={a.id} article={a} index={i + 1} />
              ))}
            </div>
            {articles.length > 10 && (
              <div>
                <h2 className="ticker-text text-xs uppercase tracking-widest text-muted-foreground mb-3 mt-8 border-t border-border pt-4">
                  More from {categoryLabel}
                </h2>
                <div className="divide-y divide-border">
                  {articles.slice(10).map((a, i) => (
                    <ArticleCard key={a.id} article={a} variant="compact" index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!query.isLoading && !query.isError && articles.length === 0 && (
          <ErrorState message="No articles found." onRetry={() => query.refetch()} />
        )}
      </div>
    </>
  );
}
