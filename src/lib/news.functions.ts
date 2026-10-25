import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { WATCHFIRE_FEED, type Article, type NewsResponse } from "@/lib/news-types";

const GNEWS_BASE = "https://gnews.io/api/v4";

interface GNewsArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

function makeId(url: string): string {
  // Stable ID from URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function normalize(arts: GNewsArticle[]): Article[] {
  return arts.map((a) => ({
    id: makeId(a.url),
    title: a.title,
    description: a.description,
    content: a.content,
    url: a.url,
    image: a.image,
    publishedAt: a.publishedAt,
    source: { name: a.source?.name ?? "Unknown", url: a.source?.url ?? "" },
  }));
}

interface WatchfireItem {
  id: string;
  title: string;
  url: string;
  source: string;
  published: string;
  topics: string[];
  status: "confirmed" | "reported";
  severity: "critical" | "high" | "info";
  summary: string;
  action: string;
}

// The feed is rebuilt every two hours; a few minutes of memory saves a fetch
// per page view without ever serving anything stale for long.
let feedMemo: { at: number; items: WatchfireItem[] } | null = null;
async function watchfireItems(): Promise<WatchfireItem[]> {
  if (feedMemo && Date.now() - feedMemo.at < 5 * 60 * 1000) return feedMemo.items;
  // WATCHFIRE_FEED_URL overrides the published feed (a local build, a staging copy).
  const res = await fetch(process.env.WATCHFIRE_FEED_URL || WATCHFIRE_FEED, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Watchfire feed ${res.status}`);
  const json = (await res.json()) as { items?: WatchfireItem[] };
  feedMemo = { at: Date.now(), items: json.items ?? [] };
  return feedMemo.items;
}

function fromWatchfire(i: WatchfireItem): Article {
  let host = "";
  try {
    host = new URL(i.url).origin;
  } catch {
    host = "";
  }
  return {
    id: "wf-" + i.id,
    title: i.title,
    description: i.summary || null,
    content: i.summary || null,
    url: i.url,
    image: null,
    publishedAt: i.published,
    source: { name: i.source, url: host },
    status: i.status,
    severity: i.severity,
    action: i.action || undefined,
    topics: i.topics,
  };
}

const inputSchema = z.object({
  category: z.string().min(1).max(40).default("security"),
  query: z.string().max(200).optional(),
  country: z.string().min(2).max(5).optional(),
  lang: z.string().min(2).max(5).default("en"),
  max: z.number().int().min(1).max(25).default(20),
});

export const fetchNews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<NewsResponse> => {
    if (data.category !== "technology") {
      try {
        const q = data.query?.trim().toLowerCase();
        const items = (await watchfireItems()).filter(
          (i) =>
            (data.category === "security" || i.topics.includes(data.category)) &&
            (!q || (i.title + " " + i.summary).toLowerCase().includes(q)),
        );
        return {
          articles: items.slice(0, Math.max(data.max, 50)).map(fromWatchfire),
          totalArticles: items.length,
          error: null,
        };
      } catch (err) {
        console.error("watchfire feed failed:", err);
        return {
          articles: [],
          totalArticles: 0,
          error: "Could not load the Watchfire feed. Try again in a minute.",
        };
      }
    }
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return {
        articles: [],
        totalArticles: 0,
        error: "News service is not configured. Please add GNEWS_API_KEY.",
      };
    }

    try {
      const params = new URLSearchParams({
        lang: data.lang,
        max: String(data.max),
        apikey: apiKey,
      });
      if (data.country) params.set("country", data.country);

      let endpoint: string;
      if (data.query && data.query.trim().length > 0) {
        endpoint = "/search";
        params.set("q", data.query.trim());
        params.set("sortby", "publishedAt");
      } else {
        endpoint = "/top-headlines";
        params.set("category", data.category);
      }

      const url = `${GNEWS_BASE}${endpoint}?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`GNews ${res.status}: ${text}`);
        if (res.status === 429) {
          return {
            articles: [],
            totalArticles: 0,
            error: "Rate limit reached. Please try again in a few minutes.",
          };
        }
        if (res.status === 401 || res.status === 403) {
          return {
            articles: [],
            totalArticles: 0,
            error: "Invalid API key. Please check your GNews configuration.",
          };
        }
        return {
          articles: [],
          totalArticles: 0,
          error: `Failed to load news (${res.status}).`,
        };
      }

      const json = (await res.json()) as GNewsResponse;
      return {
        articles: normalize(json.articles ?? []),
        totalArticles: json.totalArticles ?? 0,
        error: null,
      };
    } catch (err) {
      console.error("fetchNews failed:", err);
      return {
        articles: [],
        totalArticles: 0,
        error: "Could not reach news service. Check your connection.",
      };
    }
  });
