import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { fetchNews } from "@/server/news";
import { ArticleCard } from "@/components/article-card";
import { ArticleSkeleton } from "@/components/article-skeleton";
import { ErrorState, EmptyState } from "@/components/error-state";
import { cacheArticles } from "@/lib/article-cache";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [input, setInput] = useState(q);
  const [debounced, setDebounced] = useState(q);

  // Sync URL <- input with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(input.trim());
      navigate({ search: { q: input.trim() }, replace: true });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const query = useQuery({
    queryKey: ["news", "search", debounced],
    queryFn: async () => {
      const res = await fetchNews({
        data: { category: "general", query: debounced, max: 25, lang: "en" },
      });
      if (res.error) throw new Error(res.error);
      return res;
    },
    enabled: debounced.length >= 2,
  });

  useEffect(() => {
    if (query.data?.articles?.length) cacheArticles(query.data.articles);
  }, [query.data]);

  const articles = query.data?.articles ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="border-b border-border pb-4 mb-6">
        <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-1">
          Search
        </div>
        <h1 className="headline text-3xl md:text-4xl font-bold mb-4">Find articles</h1>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search keywords, topics, people..."
            className="w-full bg-surface border border-border pl-10 pr-10 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {input && (
            <button
              onClick={() => setInput("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {debounced.length >= 2 && !query.isLoading && !query.isError && (
          <div className="mt-3 ticker-text text-xs uppercase tracking-widest text-muted-foreground animate-fade-in">
            {articles.length} {articles.length === 1 ? "result" : "results"} for "{debounced}"
          </div>
        )}
      </div>

      {debounced.length < 2 && (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search"
          message="Enter at least 2 characters to find articles across all categories."
        />
      )}

      {debounced.length >= 2 && query.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ArticleSkeleton key={i} />
          ))}
        </div>
      )}

      {debounced.length >= 2 && query.isError && (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : "Search failed"}
          onRetry={() => query.refetch()}
        />
      )}

      {debounced.length >= 2 && !query.isLoading && !query.isError && articles.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No matches found"
          message={`No articles match "${debounced}". Try different keywords.`}
        />
      )}

      {debounced.length >= 2 && articles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
