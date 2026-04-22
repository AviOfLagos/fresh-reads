import { useEffect, useRef, useState } from "react";
import { Bell, Plus, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSubscriptions, SUGGESTED_TOPICS } from "@/lib/subscriptions";

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const {
    topics,
    notifications,
    unreadCount,
    subscribe,
    unsubscribe,
    isSubscribed,
    markAllRead,
    dismiss,
  } = useSubscriptions();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (open && unreadCount > 0) {
      // Mark read shortly after opening so the badge clears.
      const t = setTimeout(markAllRead, 600);
      return () => clearTimeout(t);
    }
  }, [open, unreadCount, markAllRead]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center border border-transparent text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center bg-primary px-1 ticker-text text-[9px] font-bold text-primary-foreground animate-fade-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-x-2 top-16 z-50 max-h-[80vh] overflow-y-auto border border-border bg-surface-elevated shadow-2xl animate-slide-down sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[360px]"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface-elevated px-3 py-2">
            <div className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
              Inbox
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3">
            <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-2">
              Follow a topic
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                subscribe(topicInput);
                setTopicInput("");
              }}
              className="flex gap-1.5"
            >
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Climate"
                maxLength={40}
                className="min-w-0 flex-1 border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 bg-primary px-2 py-1.5 text-[11px] uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </form>
            <div className="mt-2 flex flex-wrap gap-1">
              {SUGGESTED_TOPICS.map((t) => {
                const sub = isSubscribed(t);
                return (
                  <button
                    key={t}
                    onClick={() => (sub ? unsubscribe(t) : subscribe(t))}
                    className={[
                      "inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] uppercase tracking-wider transition-colors",
                      sub
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {sub && <Check className="h-2.5 w-2.5 text-primary" />}
                    {t}
                  </button>
                );
              })}
            </div>
            {topics.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <div className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Following ({topics.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {topics.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-foreground"
                    >
                      {t}
                      <button
                        onClick={() => unsubscribe(t)}
                        aria-label={`Unsubscribe from ${t}`}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border">
            <div className="px-3 py-2 ticker-text text-[10px] uppercase tracking-widest text-primary">
              Recent updates
            </div>
            {notifications.length === 0 ? (
              <div className="px-3 pb-4 text-xs text-muted-foreground">
                Follow a topic to start receiving follow-up alerts when new stories develop.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => {
                  let when = "just now";
                  try {
                    when = formatDistanceToNow(new Date(n.publishedAt), {
                      addSuffix: true,
                    });
                  } catch {
                    /* ignore */
                  }
                  return (
                    <li
                      key={n.id}
                      className="group relative px-3 py-2.5 transition-colors hover:bg-surface"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="ticker-text text-[10px] uppercase tracking-widest text-primary">
                          {n.topic}
                        </span>
                        <span className="ticker-text text-[10px] text-muted-foreground">
                          {when}
                        </span>
                      </div>
                      <h4 className="mt-1 text-sm font-semibold leading-tight">
                        {n.title}
                      </h4>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {n.summary}
                      </p>
                      <button
                        onClick={() => dismiss(n.id)}
                        aria-label="Dismiss"
                        className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center text-muted-foreground hover:text-foreground group-hover:flex"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
