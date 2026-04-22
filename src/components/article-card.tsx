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
              <span className="font-serif text-4xl">N</span>
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
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="headline text-2xl md:text-3xl font-bold text-foreground line-clamp-3 group-hover:text-primary transition-colors">
            {article.title}
          </h2>
          {article.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {article.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2 ticker-text text-[11px] uppercase tracking-widest text-muted-foreground">
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
        className="group flex gap-3 border-b border-border py-3 transition-colors hover:bg-surface px-2 -mx-2 animate-fade-up"
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-muted">
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
              <span className="font-serif text-xl">N</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest text-primary">
            <span>{article.source.name}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{timeAgo}</span>
          </div>
          <h3 className="headline text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
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
            <span className="font-serif text-3xl">N</span>
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
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest mb-2">
          <span className="text-primary font-semibold">{article.source.name}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
        <h3 className="headline text-lg font-semibold line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {article.description}
          </p>
        )}
      </div>
    </Link>
  );
}
