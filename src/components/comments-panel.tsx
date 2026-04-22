import { useState } from "react";
import { ShieldCheck, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useComments, articleVerdict, type Verdict } from "@/lib/comments";

export function CommentsPanel({ articleId }: { articleId: string }) {
  const { comments, add, vote } = useComments(articleId);
  const verdict = articleVerdict(comments);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [verifyClaim, setVerifyClaim] = useState(false);
  const [credentials, setCredentials] = useState("");

  const verdictColor =
    verdict.label === "Likely real"
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
      : verdict.label === "Likely fake"
        ? "text-primary border-primary/40 bg-primary/10"
        : verdict.label === "Disputed"
          ? "text-accent border-accent/40 bg-accent/10"
          : "text-muted-foreground border-border bg-surface";

  return (
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
            className="bg-emerald-500 transition-all duration-500"
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
          <span className="text-emerald-400">{verdict.realPct}% real</span>
          <span className="text-primary">{verdict.fakePct}% fake</span>
        </div>
      </div>

      {/* Composer */}
      <form
        className="border-b border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          add({ author, body, verifiedAuthor: verifyClaim, credentials });
          setBody("");
        }}
      >
        <div className="flex flex-col gap-2 xs:flex-row">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
          />
          {verifyClaim && (
            <input
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              placeholder="Credentials (e.g. Reporter · Reuters)"
              maxLength={80}
              className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
          )}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add context, sources, or a fact-check…"
          rows={3}
          maxLength={1000}
          className="mt-2 w-full resize-none border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={verifyClaim}
              onChange={(e) => setVerifyClaim(e.target.checked)}
              className="h-3 w-3 accent-[var(--primary)]"
            />
            I'm a verified reporter / expert
          </label>
          <button
            type="submit"
            disabled={!body.trim()}
            className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 ticker-text text-[10px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Post comment
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/70">
          Mock UI — verification, abuse-handling and persistence are described in
          <span className="font-mono"> docs/comments-fact-check.md</span>.
        </p>
      </form>

      {/* Comment list */}
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
          const handleVote = (v: Verdict) => vote(c.id, v);
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
                {c.credentials && (
                  <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.credentials}
                  </span>
                )}
                <span className="ml-auto ticker-text text-[10px] text-muted-foreground">
                  {when}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{c.body}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleVote("real")}
                  aria-pressed={c.myVote === "real"}
                  className={[
                    "inline-flex items-center gap-1 border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-colors",
                    c.myVote === "real"
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
                      : "border-border text-muted-foreground hover:border-emerald-500/60 hover:text-emerald-400",
                  ].join(" ")}
                >
                  <ThumbsUp className="h-3 w-3" />
                  Real · {c.votes.real}
                </button>
                <button
                  onClick={() => handleVote("fake")}
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
                    <div className="bg-emerald-500" style={{ width: `${realPct}%` }} />
                    <div className="bg-primary" style={{ width: `${100 - realPct}%` }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
