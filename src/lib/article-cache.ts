import type { Article } from "./news-types";

const KEY = "newsroom.articles.cache.v1";
const MAX = 200;

export function cacheArticles(articles: Article[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    const existing: Article[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, Article>();
    for (const a of [...articles, ...existing]) map.set(a.id, a);
    const merged = Array.from(map.values()).slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

export function getCachedArticle(id: string): Article | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const list: Article[] = JSON.parse(raw);
    return list.find((a) => a.id === id) ?? null;
  } catch {
    return null;
  }
}

export function getAllCached(): Article[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
