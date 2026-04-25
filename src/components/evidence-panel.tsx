import { useState } from "react";
import {
  Link2,
  Image as ImageIcon,
  FileText,
  Loader2,
  LogIn,
  Trash2,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  ArrowBigUp,
  ArrowBigDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/use-auth";
import { useEvidence, type EvidenceKind, type EvidenceRow } from "@/lib/use-evidence";
import { AuthDialog } from "@/components/auth-dialog";

type Tab = EvidenceKind;

export function EvidencePanel({ articleId }: { articleId: string }) {
  const { user } = useAuth();
  const { items, loading, error, submit, remove, vote } = useEvidence(
    articleId,
    user?.id ?? null,
  );

  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const defaultName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ??
    user?.email?.split("@")[0] ??
    "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setSubmitting(true);
    const res = await submit({
      authorDisplay: defaultName,
      kind: tab,
      body: tab === "text" ? text : caption,
      imageUrl: tab === "image_url" ? imageUrl : undefined,
      sourceUrl: tab === "source_url" ? sourceUrl : undefined,
    });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setText("");
    setImageUrl("");
    setSourceUrl("");
    setCaption("");
    toast.success("Evidence added");
  };

  const handleRemove = async (id: string) => {
    const res = await remove(id);
    if (res.error) toast.error(res.error);
    else toast.success("Removed");
  };

  const handleVote = async (it: EvidenceRow, value: 1 | -1) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await vote(it.id, value);
    if (res.error) toast.error(res.error);
  };

  const TabBtn = ({
    id,
    label,
    Icon,
  }: {
    id: Tab;
    label: string;
    Icon: typeof FileText;
  }) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={[
        "inline-flex items-center gap-1.5 border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-colors",
        tab === id
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );

  return (
    <>
      <section
        className="my-8 border border-border bg-surface animate-fade-up"
        style={{ animationDelay: "280ms" }}
        aria-label="Supporting evidence"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated px-3 py-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span className="ticker-text text-[10px] uppercase tracking-widest">
              Supporting evidence
            </span>
            <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </header>

        <form className="border-b border-border p-3" onSubmit={handleSubmit}>
          {!user ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-border bg-background py-3 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in to add supporting facts
            </button>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <TabBtn id="text" label="Text" Icon={FileText} />
                <TabBtn id="image_url" label="Image" Icon={ImageIcon} />
                <TabBtn id="source_url" label="Source link" Icon={Link2} />
              </div>

              {tab === "text" && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Quote a source, paste a translation, add context, or share what you know first-hand…"
                  rows={3}
                  maxLength={2000}
                  className="w-full resize-none border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              )}

              {tab === "image_url" && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://… (image URL)"
                    className="w-full border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Caption (optional)"
                    maxLength={2000}
                    className="w-full border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {tab === "source_url" && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://… (link to a source)"
                    className="w-full border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Why does this support or refute the article? (optional)"
                    maxLength={2000}
                    className="w-full border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 ticker-text text-[10px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Submit
                </button>
              </div>
            </>
          )}
        </form>

        {loading ? (
          <div className="p-3 space-y-2">
            <div className="h-4 w-1/3 skeleton" />
            <div className="h-3 w-full skeleton" />
          </div>
        ) : error ? (
          <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Couldn't load evidence: {error}
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No evidence yet. Be the first to add a source, image, or note.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((it) => {
              let when = "just now";
              try {
                when = formatDistanceToNow(new Date(it.created_at), {
                  addSuffix: true,
                });
              } catch {
                /* ignore */
              }
              const mine = user?.id === it.user_id;
              const score = it.upvotes - it.downvotes;
              return (
                <li key={it.id} className="p-3 animate-fade-in">
                  <div className="flex gap-3">
                    {/* Vote column */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0 select-none">
                      <button
                        type="button"
                        onClick={() => handleVote(it, 1)}
                        aria-label="Upvote"
                        aria-pressed={it.myVote === 1}
                        className={[
                          "p-0.5 transition-colors",
                          it.myVote === 1
                            ? "text-primary"
                            : "text-muted-foreground hover:text-primary",
                        ].join(" ")}
                      >
                        <ArrowBigUp
                          className={[
                            "h-5 w-5",
                            it.myVote === 1 ? "fill-current" : "",
                          ].join(" ")}
                        />
                      </button>
                      <span
                        className={[
                          "ticker-text text-[11px] tabular-nums font-semibold",
                          score > 0
                            ? "text-primary"
                            : score < 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                        ].join(" ")}
                        title={`${it.upvotes} up · ${it.downvotes} down`}
                      >
                        {score}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleVote(it, -1)}
                        aria-label="Downvote"
                        aria-pressed={it.myVote === -1}
                        className={[
                          "p-0.5 transition-colors",
                          it.myVote === -1
                            ? "text-destructive"
                            : "text-muted-foreground hover:text-destructive",
                        ].join(" ")}
                      >
                        <ArrowBigDown
                          className={[
                            "h-5 w-5",
                            it.myVote === -1 ? "fill-current" : "",
                          ].join(" ")}
                        />
                      </button>
                    </div>

                    {/* Body column */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {it.author_display}
                        </span>
                        <span className="ticker-text text-[9px] uppercase tracking-widest text-accent border border-accent/40 px-1.5 py-0.5">
                          {it.kind === "text"
                            ? "Note"
                            : it.kind === "image_url"
                              ? "Image"
                              : "Source"}
                        </span>
                        <span className="ml-auto ticker-text text-[10px] text-muted-foreground">
                          {when}
                        </span>
                        {mine && (
                          <button
                            onClick={() => handleRemove(it.id)}
                            aria-label="Delete"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {it.kind === "image_url" && it.image_url && (
                        <div className="mt-2 overflow-hidden border border-border bg-muted">
                          <img
                            src={it.image_url}
                            alt={it.body ?? "Evidence image"}
                            loading="lazy"
                            className="max-h-96 w-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      )}

                      {it.body && (
                        <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                          {it.body}
                        </p>
                      )}

                      {it.kind === "source_url" && it.source_url && (
                        <a
                          href={it.source_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {it.source_url}
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
