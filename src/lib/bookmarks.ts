import { useEffect, useState, useCallback } from "react";
import type { Article } from "./news-types";

const KEY = "newsroom.bookmarks.v1";

function readAll(): Article[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Article[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: Article[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("bookmarks:changed"));
}

export function useBookmarks() {
  const [items, setItems] = useState<Article[]>([]);

  useEffect(() => {
    setItems(readAll());
    const onChange = () => setItems(readAll());
    window.addEventListener("bookmarks:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("bookmarks:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isBookmarked = useCallback(
    (id: string) => items.some((a) => a.id === id),
    [items],
  );

  const toggle = useCallback(
    (article: Article) => {
      const current = readAll();
      const exists = current.some((a) => a.id === article.id);
      const next = exists
        ? current.filter((a) => a.id !== article.id)
        : [article, ...current];
      writeAll(next);
      return !exists;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const current = readAll();
    writeAll(current.filter((a) => a.id !== id));
  }, []);

  return { items, isBookmarked, toggle, remove };
}
