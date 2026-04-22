import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Article, NewsResponse } from "@/lib/news-types";

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

const inputSchema = z.object({
  category: z.string().min(1).max(40).default("general"),
  query: z.string().max(200).optional(),
  lang: z.string().min(2).max(5).default("en"),
  max: z.number().int().min(1).max(25).default(20),
});

export const fetchNews = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<NewsResponse> => {
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
