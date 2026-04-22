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
import { SourceFilter } from "@/components/source-filter";
import { cacheArticles, getAllCached } from "@/lib/article-cache";
import { useSources } from "@/lib/use-sources";

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
  const { enabled, all: allSources } = useSources();

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

  // Defined below — re-cache once the merged list is computed so mock-source
  // re-attributed articles can also be opened from /article/$id.

  const categoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "News";
  const rawArticles = query.data?.articles ?? [];

  // Multi-source mock: re-attribute a slice of real articles to enabled mock
  // sources so toggling sources visibly changes the feed. See docs/multi-source.md
  // for the production aggregation strategy.
  const mockSources = allSources.filter((s) => !s.live && enabled.includes(s.id));
  const liveOn = enabled.includes("gnews");
  const baseArticles = liveOn ? rawArticles : [];
  const mockArticles = mockSources.flatMap((src, srcIdx) =>
    rawArticles.slice(srcIdx, srcIdx + 3).map((a, i) => ({
      ...a,
      id: `${a.id}_${src.id}`,
      source: { name: src.name, url: a.source.url },
      title: a.title,
      // Stagger publish time so they don't collide with the live ones
      publishedAt: new Date(
        new Date(a.publishedAt).getTime() - (srcIdx * 3 + i + 1) * 60_000,
      ).toISOString(),
    })),
  );
  const articles = [...baseArticles, ...mockArticles].sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );

  // Cache the merged list so mock-source articles are also openable
  // on the article details route.
  useEffect(() => {
    if (mockArticles.length) cacheArticles(mockArticles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockArticles.length, enabled.join(",")]);

  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const fallbackCached = isOffline && query.isError ? getAllCached() : [];
  const showOfflineFallback = !!fallbackCached.length;

  return (
    <>
      <CategoryTabs active={category} />
      <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6 md:py-8">
        <div className="mb-4 flex items-end justify-between gap-2 border-b border-border pb-3 sm:mb-6 sm:gap-4 sm:pb-4">
          <div className="min-w-0">
            <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-1">
              Section
            </div>
            <h1 className="headline text-2xl font-bold sm:text-3xl md:text-4xl truncate">
              {categoryLabel}
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 bg-accent animate-pulse-dot" />
            {query.isFetching ? "Updating" : "Live"}
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <SourceFilter />
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
            <div className="mb-4 border border-border bg-surface px-3 py-2.5 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground animate-fade-in sm:px-4 sm:py-3 sm:text-xs">
              Showing cached articles · You are offline
            </div>
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {fallbackCached.slice(0, 12).map((a, i) => (
                <ArticleCard key={a.id} article={a} index={i} />
              ))}
            </div>
          </>
        )}

        {!query.isLoading && !query.isError && articles.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            <ArticleCard article={articles[0]} variant="hero" index={0} />
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {articles.slice(1, 10).map((a, i) => (
                <ArticleCard key={a.id} article={a} index={i + 1} />
              ))}
            </div>
            {articles.length > 10 && (
              <div>
                <h2 className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-2 mt-6 border-t border-border pt-3 sm:text-xs sm:mb-3 sm:mt-8 sm:pt-4">
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
          <ErrorState
            message={
              enabled.length === 0
                ? "Enable at least one source to see articles."
                : "No articles found for the selected sources."
            }
            onRetry={() => query.refetch()}
          />
        )}
      </div>
    </>
  );
}
