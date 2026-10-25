import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useBookmarks } from "@/lib/bookmarks";
import type { Article } from "@/lib/news-types";
import { useState } from "react";

interface Props {
  article: Article;
  variant?: "default" | "hero" | "compact";
  index?: number;
}

export function ArticleCard({ article, variant = "default", index = 0 }: Props) {
  const { isBookmarked, toggle } = useBookmarks();
  const [imgError, setImgError] = useState(false);
  const saved = isBookmarked(article.id);

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
    } catch {
      return "recently";
    }
  })();

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(article);
  };

  if (variant === "hero") {
    return (
      <Link
        to="/article/$id"
        params={{ id: article.id }}
        className="group relative block overflow-hidden border border-border bg-surface card-hover animate-fade-up"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {article.image && !imgError ? (
            <img
              src={article.image}
              alt={article.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <img src="/watchfire.svg" alt="" className="h-12 w-12 opacity-50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="bg-primary px-2 py-0.5 ticker-text text-[10px] uppercase tracking-widest text-primary-foreground">
              Featured
            </span>
            <span className="bg-background/80 px-2 py-0.5 ticker-text text-[10px] uppercase tracking-widest text-foreground backdrop-blur">
              {article.source.name}
            </span>
          </div>
          <button
            onClick={handleBookmark}
            aria-label={saved ? "Remove bookmark" : "Save article"}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {saved ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5">
          <h2 className="headline text-base sm:text-2xl md:text-3xl font-bold text-foreground line-clamp-3 group-hover:text-primary transition-colors">
            {article.title}
          </h2>
          {article.description && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 sm:mt-2 sm:text-sm">
              {article.description}
            </p>
          )}
          <WatchfireMeta article={article} />
          <div className="mt-2 flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground sm:mt-3 sm:text-[11px]">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        to="/article/$id"
        params={{ id: article.id }}
        className="group flex gap-2 border-b border-border py-2.5 transition-colors hover:bg-surface px-2 -mx-2 animate-fade-up sm:gap-3 sm:py-3"
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-muted sm:h-20 sm:w-20">
          {article.image && !imgError ? (
            <img
              src={article.image}
              alt=""
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <img src="/watchfire.svg" alt="" className="h-6 w-6 opacity-50 sm:h-8 sm:w-8" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 min-w-0 sm:gap-1">
          <div className="flex items-center gap-1.5 ticker-text text-[9px] uppercase tracking-widest text-primary sm:gap-2 sm:text-[10px]">
            <span className="truncate">{article.source.name}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground truncate">{timeAgo}</span>
          </div>
          <h3 className="headline text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors sm:text-base">
            {article.title}
          </h3>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/article/$id"
      params={{ id: article.id }}
      className="group flex flex-col overflow-hidden border border-border bg-surface card-hover animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {article.image && !imgError ? (
          <img
            src={article.image}
            alt={article.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <img src="/watchfire.svg" alt="" className="h-10 w-10 opacity-50" />
          </div>
        )}
        <button
          onClick={handleBookmark}
          aria-label={saved ? "Remove bookmark" : "Save article"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex items-center gap-1.5 ticker-text text-[9px] uppercase tracking-widest mb-1.5 sm:gap-2 sm:text-[10px] sm:mb-2">
          <span className="text-primary font-semibold truncate">{article.source.name}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
        <h3 className="headline text-base font-semibold line-clamp-3 group-hover:text-primary transition-colors sm:text-lg">
          {article.title}
        </h3>
        {article.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 sm:mt-2 sm:text-sm">
            {article.description}
          </p>
        )}
        <WatchfireMeta article={article} />
      </div>
    </Link>
  );
}

function WatchfireMeta({ article }: { article: Article }) {
  if (!article.status && !article.action) return null;
  const tone =
    article.severity === "critical"
      ? "border-destructive text-destructive"
      : article.severity === "high"
        ? "border-primary text-primary"
        : "border-border text-muted-foreground";
  return (
    <div className="mt-2 space-y-1">
      {article.status && (
        <span
          className={`inline-block border px-1.5 py-0.5 ticker-text text-[9px] uppercase tracking-widest ${tone}`}
          title={
            article.status === "confirmed"
              ? "From an advisory database or the researchers who found it"
              : "Reported by the security press"
          }
        >
          {article.severity === "critical" ? "Critical · " : ""}
          {article.status}
        </span>
      )}
      {article.action && (
        <p className="text-xs text-foreground/90 line-clamp-2">
          <span className="font-semibold">What to do: </span>
          {article.action}
        </p>
      )}
    </div>
  );
}
