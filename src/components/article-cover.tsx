import type { Article } from "@/lib/news-types";
import { CATEGORIES } from "@/lib/news-types";

// Shown when an article has no image, or its image fails to load: a cover
// in the article's own colours (severity) with its topic, instead of a blank.
const TONE: Record<string, string> = {
  critical: "from-red-600/90 via-red-900/80 to-zinc-950",
  high: "from-orange-500/90 via-orange-900/80 to-zinc-950",
  medium: "from-amber-500/80 via-amber-900/70 to-zinc-950",
};
const CALM = "from-sky-600/70 via-slate-800/80 to-zinc-950";

export function ArticleCover({ article, size = "md" }: { article: Article; size?: "sm" | "md" | "lg" }) {
  const tone = TONE[article.severity ?? ""] ?? CALM;
  const topic = article.topics?.[0];
  const label = CATEGORIES.find((c) => c.id === topic)?.label ?? topic ?? article.source.name;
  const mark = size === "sm" ? "h-6 w-6 sm:h-8 sm:w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  return (
    <div
      aria-hidden
      className={`relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${tone}`}
    >
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)",
        }}
      />
      <img src="/watchfire.svg" alt="" className={`relative ${mark} drop-shadow`} />
      {size !== "sm" && label && (
        <span className="relative ticker-text text-[10px] uppercase tracking-[0.2em] text-white/85">
          {label}
        </span>
      )}
    </div>
  );
}
