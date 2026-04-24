import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchNews } from "@/server/news";
import { topicsToQuery, COUNTRY_OPTIONS } from "@/lib/interests";
import type { CategoryId } from "@/lib/news-types";

interface Props {
  categories: CategoryId[];
  topics: string[];
  country: string;
}

/**
 * Live preview of the top articles a user would see given the current
 * (in-modal, unsaved) selections. Debounces by 350ms so rapid toggling
 * doesn't hammer the news API.
 */
export function InterestsPreview({ categories, topics, country }: Props) {
  // Debounce so we don't query on every chip click.
  const [debounced, setDebounced] = useState({ categories, topics, country });
  useEffect(() => {
    const t = setTimeout(() => setDebounced({ categories, topics, country }), 350);
    return () => clearTimeout(t);
  }, [categories, topics, country]);

  // Pick the primary category — first selected, or default to technology.
  const primaryCategory: CategoryId =
    (debounced.categories[0] as CategoryId | undefined) ?? "technology";
  const topicQuery = debounced.topics.length ? topicsToQuery(debounced.topics) : "";

  const { data, isFetching, isError } = useQuery({
    queryKey: [
      "interests-preview",
      primaryCategory,
      topicQuery,
      debounced.country,
    ],
    queryFn: () =>
      fetchNews({
        data: {
          category: primaryCategory,
          query: topicQuery || undefined,
          country: debounced.country || undefined,
          max: 3,
          lang: "en",
        },
      }),
    staleTime: 60_000,
  });

  const articles = data?.articles ?? [];
  const countryLabel =
    COUNTRY_OPTIONS.find((c) => c.code === debounced.country)?.label ??
    (debounced.country ? debounced.country.toUpperCase() : null);

  return (
    <section className="border border-border bg-background/40">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-surface-elevated px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Newspaper className="h-3 w-3 text-primary" />
          <span className="ticker-text text-[10px] uppercase tracking-widest">
            Preview your feed
          </span>
        </div>
        <div className="flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          <span className="hidden xs:inline">Top {articles.length || 3}</span>
        </div>
      </header>

      {/* Active filters chips */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-1.5 text-[10px] text-muted-foreground">
        <span className="ticker-text uppercase tracking-widest text-primary">
          {primaryCategory}
        </span>
        {countryLabel && (
          <span className="ticker-text uppercase tracking-widest text-accent">
            · {countryLabel}
          </span>
        )}
        {debounced.topics.slice(0, 4).map((t) => (
          <span key={t} className="border border-border px-1.5 py-0.5">
            {t}
          </span>
        ))}
        {debounced.topics.length > 4 && (
          <span>+{debounced.topics.length - 4}</span>
        )}
        {!debounced.topics.length && !countryLabel && debounced.categories.length === 0 && (
          <span className="inline-flex items-center gap-1 text-muted-foreground/80">
            <Sparkles className="h-3 w-3" />
            Pick interests above to tailor this preview
          </span>
        )}
      </div>

      <div className="p-2 space-y-2 min-h-[120px]">
        {isFetching && articles.length === 0 && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex gap-2 border border-border/60 bg-surface px-2 py-2"
              >
                <div className="h-12 w-16 shrink-0 skeleton" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 skeleton" />
                  <div className="h-2 w-1/2 skeleton" />
                </div>
              </div>
            ))}
          </>
        )}

        {isError && (
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3" />
            Couldn't load preview. Your selections will still save.
          </div>
        )}

        {!isFetching && !isError && articles.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-4">
            No matching articles right now — try fewer topics or another country.
          </div>
        )}

        {articles.map((a) => {
          let when = "";
          try {
            when = formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true });
          } catch {
            /* ignore */
          }
          return (
            <article
              key={a.id}
              className="flex gap-2 border border-border/60 bg-surface px-2 py-2 transition-colors hover:border-primary/40"
            >
              {a.image ? (
                <img
                  src={a.image}
                  alt=""
                  loading="lazy"
                  className="h-12 w-16 shrink-0 object-cover"
                />
              ) : (
                <div className="h-12 w-16 shrink-0 bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold leading-snug line-clamp-2">
                  {a.title}
                </h4>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="truncate">{a.source.name}</span>
                  {when && <span className="shrink-0">· {when}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
