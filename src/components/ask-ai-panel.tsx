import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, LogIn, MessageSquarePlus, Trash2, AlertTriangle, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/use-auth";
import { askArticleQuestion } from "@/server/ask-ai";
import { supabase } from "@/integrations/supabase/client";
import { AuthDialog } from "@/components/auth-dialog";
import type { Article } from "@/lib/news-types";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "Summarize this in one sentence.",
  "Is this likely real or fake?",
  "What's missing from the story?",
  "Who are the named sources?",
];

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function AskAiPanel({ article }: { article: Article }) {
  const { user } = useAuth();
  const ask = useServerFn(askArticleQuestion);

  const [sessionId, setSessionId] = useState<string>(() => newSessionId());
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (questionText: string) => {
    const q = questionText.trim();
    if (!q) return;
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const userMsg: ChatMsg = { id: newSessionId(), role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Persist user message (best-effort)
    void supabase.from("ai_chat_messages").insert({
      article_id: article.id,
      user_id: user.id,
      session_id: sessionId,
      role: "user",
      content: q,
    });

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await ask({
        data: {
          question: q,
          history,
          article: {
            title: article.title,
            description: article.description,
            content: article.content,
            sourceName: article.source.name,
            url: article.url,
          },
        },
      });

      if (res.error || !res.answer) {
        toast.error(res.error ?? "AI failed to answer.");
        setMessages((prev) => [
          ...prev,
          { id: newSessionId(), role: "assistant", content: `(error: ${res.error ?? "no answer"})` },
        ]);
      } else {
        const aiMsg: ChatMsg = { id: newSessionId(), role: "assistant", content: res.answer };
        setMessages((prev) => [...prev, aiMsg]);
        void supabase.from("ai_chat_messages").insert({
          article_id: article.id,
          user_id: user.id,
          session_id: sessionId,
          role: "assistant",
          content: res.answer,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't reach the AI.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setSessionId(newSessionId());
  };

  const saveAsComment = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (messages.length === 0) {
      toast.info("Ask the AI something first.");
      return;
    }
    setSavingComment(true);
    const transcript = messages
      .map((m) => (m.role === "user" ? `Q: ${m.content}` : `AI: ${m.content}`))
      .join("\n\n");

    const author =
      (user.user_metadata as { display_name?: string } | undefined)?.display_name ??
      user.email?.split("@")[0] ??
      "Reader";

    const body = `🤖 AI conversation about this article\n\n${transcript}`.slice(0, 1000);

    const { error } = await supabase.from("comments").insert({
      article_id: article.id,
      user_id: user.id,
      author_display: author,
      body,
    });
    setSavingComment(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conversation saved as comment");
    }
  };

  return (
    <>
      <section
        className="my-8 border border-border bg-surface animate-fade-up"
        style={{ animationDelay: "300ms" }}
        aria-label="Ask AI about this article"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-elevated px-3 py-2">
          <div className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-accent" />
            <span className="ticker-text text-[10px] uppercase tracking-widest">
              Ask AI about this article
            </span>
            <span className="inline-flex items-center gap-1 text-accent ticker-text text-[10px] uppercase tracking-widest">
              <Sparkles className="h-3 w-3" />
              Beta
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={saveAsComment}
                  disabled={savingComment}
                  className="inline-flex items-center gap-1 border border-border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                >
                  {savingComment ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquarePlus className="h-3 w-3" />}
                  Save as comment
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 border border-border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  aria-label="Reset conversation"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </header>

        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-3 space-y-2.5">
          {messages.length === 0 ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The AI only has access to this article — it won't make up facts. Try:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="border border-border bg-background px-2 py-1 text-xs text-foreground/90 hover:border-primary hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={[
                  "max-w-[90%] border px-2.5 py-2 text-sm leading-relaxed whitespace-pre-line animate-fade-in",
                  m.role === "user"
                    ? "ml-auto bg-primary/10 border-primary/30 text-foreground"
                    : "mr-auto bg-background border-border text-foreground/90",
                ].join(" ")}
              >
                <span className="ticker-text text-[9px] uppercase tracking-widest text-muted-foreground block mb-0.5">
                  {m.role === "user" ? "You" : "AI"}
                </span>
                {m.content}
              </div>
            ))
          )}
          {loading && (
            <div className="mr-auto inline-flex items-center gap-2 border border-border bg-background px-2.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking…
            </div>
          )}
        </div>

        <form
          className="border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          {!user ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-border bg-background py-3 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in to ask the AI
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about this article…"
                maxLength={2000}
                disabled={loading}
                className="flex-1 border border-border bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center gap-1 bg-primary px-3 py-1.5 ticker-text text-[10px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-3 w-3" />
                Send
              </button>
            </div>
          )}
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <AlertTriangle className="h-2.5 w-2.5" />
            AI can be wrong. Cross-check before sharing.
          </p>
        </form>
      </section>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
