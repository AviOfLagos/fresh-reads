import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, ExternalLink, Share2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCachedArticle } from "@/lib/article-cache";
import { useBookmarks } from "@/lib/bookmarks";
import type { Article } from "@/lib/news-types";

export const Route = createFileRoute("/article/$id")({
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="headline text-3xl font-bold mb-2">Article not found</h1>
      <p className="text-muted-foreground mb-6">
        This article isn't in your cache. Open it from the feed to view details.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm uppercase tracking-wider text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feed
      </Link>
    </div>
  ),
});

function ArticlePage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const { isBookmarked, toggle } = useBookmarks();

  useEffect(() => {
    const cached = getCachedArticle(id);
    setArticle(cached);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="h-6 w-32 skeleton" />
        <div className="aspect-[16/9] skeleton" />
        <div className="h-10 w-3/4 skeleton" />
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-2/3 skeleton" />
      </div>
    );
  }

  if (!article) {
    throw notFound();
  }

  const saved = isBookmarked(article.id);

  const handleShare = async () => {
    const shareData = { title: article.title, url: article.url };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(article.url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleBookmark = () => {
    const added = toggle(article);
    toast.success(added ? "Article saved" : "Bookmark removed");
  };

  let timeAgo = "recently";
  let fullDate = "";
  try {
    const d = new Date(article.publishedAt);
    timeAgo = formatDistanceToNow(d, { addSuffix: true });
    fullDate = format(d, "MMMM d, yyyy · h:mm a");
  } catch {
    // ignore
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 md:py-8 animate-fade-in">
      <button
        onClick={() => router.history.back()}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-4 flex items-center gap-2 ticker-text text-[10px] uppercase tracking-widest">
        <span className="bg-primary px-2 py-0.5 text-primary-foreground">
          {article.source.name}
        </span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
      </div>

      <h1 className="headline text-3xl md:text-5xl font-bold mb-4 animate-fade-up">
        {article.title}
      </h1>

      {article.description && (
        <p
          className="text-lg text-muted-foreground leading-relaxed mb-6 animate-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          {article.description}
        </p>
      )}

      {fullDate && (
        <div
          className="ticker-text text-xs uppercase tracking-widest text-muted-foreground mb-6 pb-4 border-b border-border animate-fade-up"
          style={{ animationDelay: "150ms" }}
        >
          Published {fullDate}
        </div>
      )}

      {article.image && (
        <div
          className="aspect-[16/9] mb-6 overflow-hidden bg-muted animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {article.content && (
        <div
          className="prose prose-invert max-w-none text-base leading-relaxed text-foreground/90 mb-8 whitespace-pre-line animate-fade-up"
          style={{ animationDelay: "250ms" }}
        >
          {article.content.replace(/\[\d+ chars\]$/, "...")}
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-3 border-t border-border pt-6 animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-medium uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" />
          Read full article
        </a>
        <button
          onClick={handleBookmark}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm uppercase tracking-wider hover:border-primary hover:text-primary transition-colors"
        >
          {saved ? (
            <>
              <BookmarkCheck className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              Save
            </>
          )}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm uppercase tracking-wider hover:border-primary hover:text-primary transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Source: <a href={article.source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">{article.source.name}</a>
      </p>
    </article>
  );
}
