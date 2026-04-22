import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { mockSummarize } from "@/lib/summary";
import type { Article } from "@/lib/news-types";

export function ArticleSummary({ article }: { article: Article }) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(() => mockSummarize(article));

  const regenerate = () => {
    setLoading(true);
    // Simulate AI roundtrip
    setTimeout(() => {
      setSummary(mockSummarize(article));
      setLoading(false);
    }, 700);
  };

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
              <div className="h-4 w-5/6 skeleton" />
              <div className="h-3 w-full skeleton" />
              <div className="h-3 w-4/6 skeleton" />
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-foreground">
                <span className="ticker-text text-[10px] uppercase tracking-widest text-primary mr-1.5">
                  TL;DR
                </span>
                {summary.tldr}
              </p>
              <ul className="space-y-1.5">
                {summary.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="mt-1 h-1 w-1 shrink-0 bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-2">
                <div className="ticker-text text-[10px] uppercase tracking-widest text-accent mb-1">
                  Why it matters
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {summary.whyItMatters}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <div className="flex items-center gap-1.5 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  ~{summary.readingTimeSeconds}s
                </div>
                <button
                  onClick={regenerate}
                  className="ticker-text text-[10px] uppercase tracking-widest text-primary hover:underline"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Mock summary — see <span className="font-mono">docs/ai-summary.md</span> for the
                production AI gateway plan.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
