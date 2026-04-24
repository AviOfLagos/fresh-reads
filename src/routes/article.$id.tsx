import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, ExternalLink, Share2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCachedArticle } from "@/lib/article-cache";
import { useBookmarks } from "@/lib/bookmarks";
import { ArticleSummary } from "@/components/article-summary";
import { CommentsPanel } from "@/components/comments-panel";
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
    <article className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-6 md:py-8 animate-fade-in">
      <button
        onClick={() => router.history.back()}
        className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground mb-4 transition-colors sm:mb-6 sm:text-xs"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-3 flex flex-wrap items-center gap-2 ticker-text text-[10px] uppercase tracking-widest sm:mb-4">
        <span className="bg-primary px-2 py-0.5 text-primary-foreground">
          {article.source.name}
        </span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
      </div>

      <h1 className="headline text-2xl font-bold mb-3 animate-fade-up sm:text-3xl sm:mb-4 md:text-5xl">
        {article.title}
      </h1>

      {article.description && (
        <p
          className="text-base text-muted-foreground leading-relaxed mb-4 animate-fade-up sm:text-lg sm:mb-6"
          style={{ animationDelay: "100ms" }}
        >
          {article.description}
        </p>
      )}

      {fullDate && (
        <div
          className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-4 pb-3 border-b border-border animate-fade-up sm:text-xs sm:mb-6 sm:pb-4"
          style={{ animationDelay: "150ms" }}
        >
          Published {fullDate}
        </div>
      )}

      {article.image && (
        <div
          className="aspect-[16/9] mb-4 overflow-hidden bg-muted animate-fade-up sm:mb-6"
          style={{ animationDelay: "200ms" }}
        >
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* AI summary */}
      <ArticleSummary article={article} />

      {article.content && (
        <div
          className="prose prose-invert max-w-none text-sm leading-relaxed text-foreground/90 mb-6 whitespace-pre-line animate-fade-up sm:text-base sm:mb-8"
          style={{ animationDelay: "250ms" }}
        >
          {article.content.replace(/\[\d+ chars\]$/, "...")}
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-2 border-t border-border pt-4 animate-fade-up sm:gap-3 sm:pt-6"
        style={{ animationDelay: "300ms" }}
      >
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden xs:inline">Read full article</span>
          <span className="xs:hidden">Read</span>
        </a>
        <button
          onClick={handleBookmark}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[11px] uppercase tracking-wider hover:border-primary hover:text-primary transition-colors sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {saved ? (
            <>
              <BookmarkCheck className="h-4 w-4" />
              <span className="hidden xs:inline">Saved</span>
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              <span className="hidden xs:inline">Save</span>
            </>
          )}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[11px] uppercase tracking-wider hover:border-primary hover:text-primary transition-colors sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden xs:inline">Share</span>
        </button>
      </div>

      <p className="mt-4 text-[10px] text-muted-foreground sm:mt-6 sm:text-xs">
        Source:{" "}
        <a
          href={article.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          {article.source.name}
        </a>
      </p>

      {/* Community fact-check + comments */}
      <CommentsPanel articleId={article.id} />
    </article>
  );
}
