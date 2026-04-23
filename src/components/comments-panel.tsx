import { useState } from "react";
import { ShieldCheck, ThumbsUp, ThumbsDown, MessageSquare, LogIn, Loader2, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/use-auth";
import { useComments, articleVerdict, type Verdict } from "@/lib/use-comments";
import { AuthDialog } from "@/components/auth-dialog";
import { supabase } from "@/integrations/supabase/client";

export function CommentsPanel({ articleId }: { articleId: string }) {
  const { user } = useAuth();
  const { comments, loading, error, add, vote } = useComments(articleId, user?.id ?? null);
  const verdict = articleVerdict(comments);
  const [body, setBody] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ??
    user?.email?.split("@")[0] ??
    "";

  const verdictColor =
    verdict.label === "Likely real"
      ? "text-success border-success/40 bg-success/10"
      : verdict.label === "Likely fake"
        ? "text-primary border-primary/40 bg-primary/10"
        : verdict.label === "Disputed"
          ? "text-accent border-accent/40 bg-accent/10"
          : "text-muted-foreground border-border bg-surface";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await add({ authorDisplay: defaultName, body });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setBody("");
      toast.success("Comment posted");
    }
  };

  const handleVote = async (commentId: string, v: Verdict) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const res = await vote(commentId, v);
    if (res.error) toast.error(res.error);
  };

  return (
    <>
      <section
        className="my-8 border border-border bg-surface animate-fade-up"
        style={{ animationDelay: "260ms" }}
        aria-label="Community verification and comments"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated px-3 py-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <span className="ticker-text text-[10px] uppercase tracking-widest">
              Community check
            </span>
            <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
              {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 border px-2 py-0.5 ticker-text text-[10px] uppercase tracking-widest ${verdictColor}`}
          >
            <ShieldCheck className="h-3 w-3" />
            {verdict.label}
            {verdict.totalVotes > 0 && (
              <span className="text-muted-foreground">· {verdict.totalVotes} votes</span>
            )}
          </div>
        </header>

        {/* Verdict bar */}
        <div className="px-3 pt-3">
          <div className="flex h-2 w-full overflow-hidden bg-muted">
            <div
              className="bg-success transition-all duration-500"
              style={{ width: `${verdict.realPct}%` }}
              aria-label={`${verdict.realPct}% real`}
            />
            <div
              className="bg-primary transition-all duration-500"
              style={{ width: `${verdict.fakePct}%` }}
              aria-label={`${verdict.fakePct}% fake`}
            />
          </div>
          <div className="mt-1 flex items-center justify-between ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="text-success">{verdict.realPct}% real</span>
            <span className="text-primary">{verdict.fakePct}% fake</span>
          </div>
        </div>

        {/* Composer */}
        <form className="border-b border-border p-3" onSubmit={handleSubmit}>
          {!user ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-border bg-background py-3 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in to post a comment or fact-check
            </button>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
                  Posting as <span className="text-foreground">{defaultName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                  Sign out
                </button>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add context, sources, or a fact-check…"
                rows={3}
                maxLength={1000}
                className="w-full resize-none border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground/70">
                  {body.length}/1000
                </span>
                <button
                  type="submit"
                  disabled={!body.trim() || submitting}
                  className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 ticker-text text-[10px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Post comment
                </button>
              </div>
            </>
          )}
        </form>

        {/* Comment list */}
        {loading ? (
          <div className="p-3 space-y-2">
            <div className="h-4 w-1/3 skeleton" />
            <div className="h-3 w-full skeleton" />
            <div className="h-3 w-5/6 skeleton" />
          </div>
        ) : error ? (
          <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Couldn't load comments: {error}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {comments.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                Be the first to weigh in.
              </li>
            )}
            {comments.map((c) => {
              let when = "just now";
              try {
                when = formatDistanceToNow(new Date(c.createdAt), { addSuffix: true });
              } catch {
                /* ignore */
              }
              const total = c.votes.real + c.votes.fake;
              const realPct = total === 0 ? 0 : Math.round((c.votes.real / total) * 100);
              return (
                <li key={c.id} className="p-3 animate-fade-in">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{c.author}</span>
                    {c.verifiedAuthor && (
                      <span className="inline-flex items-center gap-1 border border-accent/50 bg-accent/10 px-1.5 py-0.5 ticker-text text-[9px] uppercase tracking-widest text-accent">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        Verified
                      </span>
                    )}
                    <span className="ml-auto ticker-text text-[10px] text-muted-foreground">
                      {when}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {c.body}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleVote(c.id, "real")}
                      aria-pressed={c.myVote === "real"}
                      className={[
                        "inline-flex items-center gap-1 border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-colors",
                        c.myVote === "real"
                          ? "border-success/60 bg-success/10 text-success"
                          : "border-border text-muted-foreground hover:border-success/60 hover:text-success",
                      ].join(" ")}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      Real · {c.votes.real}
                    </button>
                    <button
                      onClick={() => handleVote(c.id, "fake")}
                      aria-pressed={c.myVote === "fake"}
                      className={[
                        "inline-flex items-center gap-1 border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-colors",
                        c.myVote === "fake"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                      ].join(" ")}
                    >
                      <ThumbsDown className="h-3 w-3" />
                      Fake · {c.votes.fake}
                    </button>
                    {total > 0 && (
                      <div className="flex h-1 flex-1 min-w-[60px] overflow-hidden bg-muted">
                        <div className="bg-success" style={{ width: `${realPct}%` }} />
                        <div className="bg-primary" style={{ width: `${100 - realPct}%` }} />
                      </div>
                    )}
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
