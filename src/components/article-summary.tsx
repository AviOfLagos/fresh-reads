import { useEffect, useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { summarizeArticle, type SummaryPayload } from "@/server/summarize";
import type { Article } from "@/lib/news-types";

const CACHE_KEY = "newsroom.summaries.v1";

interface CacheEntry {
  payload: SummaryPayload;
  cachedAt: number;
}

function readCache(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(map: Record<string, CacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    // Trim cache to 200 entries
    const entries = Object.entries(map).sort((a, b) => b[1].cachedAt - a[1].cachedAt);
    const trimmed = Object.fromEntries(entries.slice(0, 200));
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — ignore */
  }
}

export function ArticleSummary({ article }: { article: Article }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryPayload | null>(null);

  const fetchSummary = async (force = false) => {
    setError(null);
    if (!force) {
      const cache = readCache();
      const hit = cache[article.id];
      if (hit) {
        setSummary(hit.payload);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await summarizeArticle({
        data: {
          articleId: article.id,
          title: article.title,
          description: article.description ?? undefined,
          content: article.content ?? undefined,
          sourceName: article.source.name,
        },
      });
      if (res.error || !res.summary) {
        setError(res.error ?? "Couldn't generate a summary.");
        setSummary(null);
      } else {
        setSummary(res.summary);
        const cache = readCache();
        cache[article.id] = { payload: res.summary, cachedAt: Date.now() };
        writeCache(cache);
      }
    } catch (err) {
      console.error(err);
      setError("Network error contacting AI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  return (
    <section
      className="my-6 border border-border bg-surface animate-fade-up"
      style={{ animationDelay: "180ms" }}
      aria-label="AI summary"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-surface-elevated px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="ticker-text text-[10px] uppercase tracking-widest text-foreground">
            AI Brief
          </span>
          <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hidden xs:inline">
            · 60-second read
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="p-3 space-y-3 animate-fade-in">
          {loading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Drafting brief…
              </div>
              <div className="h-4 w-5/6 skeleton" />
              <div className="h-3 w-full skeleton" />
              <div className="h-3 w-4/6 skeleton" />
            </div>
          ) : error ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 text-primary" />
                {error}
              </div>
              <button
                onClick={() => fetchSummary(true)}
                className="ticker-text text-[10px] uppercase tracking-widest text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : summary ? (
            <>
              <p className="text-sm leading-relaxed text-foreground">
                <span className="ticker-text text-[10px] uppercase tracking-widest text-primary mr-1.5">
                  TL;DR
                </span>
                {summary.tldr}
              </p>
              {summary.bullets.length > 0 && (
                <ul className="space-y-1.5">
                  {summary.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="mt-1 h-1 w-1 shrink-0 bg-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {summary.whyItMatters && (
                <div className="border-t border-border pt-2">
                  <div className="ticker-text text-[10px] uppercase tracking-widest text-accent mb-1">
                    Why it matters
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {summary.whyItMatters}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <div className="flex items-center gap-1.5 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3 w-3" />~{summary.readingTimeSeconds}s
                </div>
                <button
                  onClick={() => fetchSummary(true)}
                  className="ticker-text text-[10px] uppercase tracking-widest text-primary hover:underline"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                AI-generated · may contain errors. Powered by Lovable AI.
              </p>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
