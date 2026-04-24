// Topic subscription + notification inbox.
// Subscriptions are persisted locally. The notifications inbox stays empty
// until a real cron-driven backend job populates it — see
// docs/notifications.md for the production plan.

import { useEffect, useState, useCallback } from "react";

export interface Notification {
  id: string;
  topic: string;
  title: string;
  summary: string;
  publishedAt: string; // ISO
  read: boolean;
}

const SUBS_KEY = "newsroom.subscriptions.v1";
const NOTIF_KEY = "newsroom.notifications.v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T, eventName: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(eventName));
}

export const SUGGESTED_TOPICS = [
  "Climate",
  "Elections",
  "AI",
  "Markets",
  "Space",
  "Ukraine",
  "Premier League",
  "Federal Reserve",
];

export function useSubscriptions() {
  const [topics, setTopics] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    setTopics(read<string[]>(SUBS_KEY, []));
    setNotifications(read<Notification[]>(NOTIF_KEY, []));
    const onSub = () => setTopics(read<string[]>(SUBS_KEY, []));
    const onNotif = () => setNotifications(read<Notification[]>(NOTIF_KEY, []));
    window.addEventListener("subscriptions:changed", onSub);
    window.addEventListener("notifications:changed", onNotif);
    window.addEventListener("storage", () => {
      onSub();
      onNotif();
    });
    return () => {
      window.removeEventListener("subscriptions:changed", onSub);
      window.removeEventListener("notifications:changed", onNotif);
    };
  }, []);

  const subscribe = useCallback((topic: string) => {
    const t = topic.trim();
    if (!t) return;
    const current = read<string[]>(SUBS_KEY, []);
    if (current.includes(t)) return;
    write(SUBS_KEY, [t, ...current], "subscriptions:changed");
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    const current = read<string[]>(SUBS_KEY, []);
    write(SUBS_KEY, current.filter((t) => t !== topic), "subscriptions:changed");
  }, []);

  const isSubscribed = useCallback(
    (topic: string) => topics.includes(topic),
    [topics],
  );

  const markAllRead = useCallback(() => {
    const current = read<Notification[]>(NOTIF_KEY, []);
    write(
      NOTIF_KEY,
      current.map((n) => ({ ...n, read: true })),
      "notifications:changed",
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    const current = read<Notification[]>(NOTIF_KEY, []);
    write(NOTIF_KEY, current.filter((n) => n.id !== id), "notifications:changed");
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    topics,
    notifications,
    unreadCount,
    subscribe,
    unsubscribe,
    isSubscribed,
    markAllRead,
    dismiss,
  };
}
