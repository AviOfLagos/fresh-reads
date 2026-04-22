import { createFileRoute } from "@tanstack/react-router";
import { Bookmark, Trash2 } from "lucide-react";
import { useBookmarks } from "@/lib/bookmarks";
import { ArticleCard } from "@/components/article-card";
import { EmptyState } from "@/components/error-state";
import { toast } from "sonner";

export const Route = createFileRoute("/bookmarks")({
  component: BookmarksPage,
});

function BookmarksPage() {
  const { items } = useBookmarks();

  const clearAll = () => {
    if (typeof window === "undefined") return;
    if (!confirm("Remove all saved articles?")) return;
    window.localStorage.removeItem("newsroom.bookmarks.v1");
    window.dispatchEvent(new CustomEvent("bookmarks:changed"));
    toast.success("All bookmarks cleared");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="border-b border-border pb-4 mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-1">
            Library
          </div>
          <h1 className="headline text-3xl md:text-4xl font-bold">Saved Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? "article" : "articles"} saved on this device
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved articles yet"
          message="Tap the bookmark icon on any article to save it for later reading."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a, i) => (
            <ArticleCard key={a.id} article={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
