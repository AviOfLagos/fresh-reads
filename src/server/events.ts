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
  city: z.string().min(1).max(60).default("Lagos"),
  country: z.string().min(2).max(5).default("ng"),
  topic: z.string().max(80).default("tech"),
  max: z.number().int().min(1).max(25).default(15),
});

/**
 * Fetch upcoming-event NEWS for a given city/country/topic via GNews search.
 *
 * Note: there is no free, structured Lagos-tech-events API right now
 * (Eventbrite shut their public Search API in 2020; tix.africa has none).
 * We surface real announcements/coverage and link out to organizers.
 */
export const fetchEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<NewsResponse> => {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return {
        articles: [],
        totalArticles: 0,
        error: "Events service is not configured.",
      };
    }

    const city = data.city.trim();
    const topic = data.topic.trim() || "tech";
    // Build a focused query: city + tech-event vocabulary
    const q = `"${city}" AND (${topic} OR startup OR developer) AND (event OR conference OR hackathon OR meetup OR summit OR workshop OR fair)`;

    try {
      const params = new URLSearchParams({
        q,
        lang: "en",
        max: String(data.max),
        sortby: "publishedAt",
        country: data.country,
        apikey: apiKey,
      });

      const url = `${GNEWS_BASE}/search?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`GNews events ${res.status}: ${text}`);
        if (res.status === 429) {
          return {
            articles: [],
            totalArticles: 0,
            error: "Rate limit reached. Please try again in a few minutes.",
          };
        }
        return {
          articles: [],
          totalArticles: 0,
          error: `Failed to load events (${res.status}).`,
        };
      }

      const json = (await res.json()) as GNewsResponse;
      return {
        articles: normalize(json.articles ?? []),
        totalArticles: json.totalArticles ?? 0,
        error: null,
      };
    } catch (err) {
      console.error("fetchEvents failed:", err);
      return {
        articles: [],
        totalArticles: 0,
        error: "Could not reach events service.",
      };
    }
  });
