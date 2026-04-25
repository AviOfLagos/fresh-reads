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

export type EventType = "all" | "conference" | "meetup" | "hackathon" | "workshop" | "summit";

const TYPE_VOCAB: Record<Exclude<EventType, "all">, string[]> = {
  conference: ["conference", "summit", "expo"],
  meetup: ["meetup", "meet-up", "gathering"],
  hackathon: ["hackathon", "hack day", "buildathon"],
  workshop: ["workshop", "training", "bootcamp"],
  summit: ["summit", "forum", "convention"],
};

const inputSchema = z.object({
  city: z.string().min(1).max(60).default("Lagos"),
  country: z.string().min(2).max(5).default("ng"),
  topic: z.string().max(80).default("tech"),
  max: z.number().int().min(1).max(25).default(15),
  eventType: z
    .enum(["all", "conference", "meetup", "hackathon", "workshop", "summit"])
    .default("all"),
  // ISO date strings (YYYY-MM-DD); optional
  fromDate: z.string().max(10).optional().nullable(),
  toDate: z.string().max(10).optional().nullable(),
});

async function gnewsSearch(
  apiKey: string,
  q: string,
  country: string,
  max: number,
  fromDate?: string | null,
  toDate?: string | null,
): Promise<{ articles: GNewsArticle[]; totalArticles: number; status: number }> {
  const params = new URLSearchParams({
    q,
    lang: "en",
    max: String(max),
    sortby: "publishedAt",
    country,
    apikey: apiKey,
  });
  if (fromDate) params.set("from", `${fromDate}T00:00:00Z`);
  if (toDate) params.set("to", `${toDate}T23:59:59Z`);

  const url = `${GNEWS_BASE}/search?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    return { articles: [], totalArticles: 0, status: res.status };
  }
  const json = (await res.json()) as GNewsResponse;
  return {
    articles: json.articles ?? [],
    totalArticles: json.totalArticles ?? 0,
    status: 200,
  };
}

/**
 * Fetch upcoming-event NEWS for a given city/country/topic via GNews search.
 *
 * Strategy: run TWO parallel queries and merge:
 *   1) Editorial coverage  — "<city>" AND (tech) AND (event/conference/...)
 *   2) Organizer mentions  — "<city>" AND (eventbrite OR tix.africa OR lu.ma OR meetup.com)
 *
 * This brings in announcements that link to platforms like Eventbrite, tix.africa,
 * Lu.ma, and Meetup.com — the closest we can get to a real events API on the
 * free tier (their public Search APIs are gone or non-existent).
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

    // Type vocabulary — "all" sweeps every type.
    const typeWords =
      data.eventType === "all"
        ? ["event", "conference", "hackathon", "meetup", "summit", "workshop", "fair"]
        : TYPE_VOCAB[data.eventType];
    const typeClause = `(${typeWords.join(" OR ")})`;

    // Per-request cap — split between the two strategies.
    const perQuery = Math.max(5, Math.ceil(data.max));

    const editorialQ = `"${city}" AND (${topic} OR startup OR developer) AND ${typeClause}`;
    const organizerQ = `"${city}" AND (eventbrite OR "tix.africa" OR "lu.ma" OR meetup.com OR "luma" OR ticketmaster) AND ${typeClause}`;

    try {
      const [editorial, organizer] = await Promise.all([
        gnewsSearch(apiKey, editorialQ, data.country, perQuery, data.fromDate, data.toDate),
        gnewsSearch(apiKey, organizerQ, data.country, perQuery, data.fromDate, data.toDate),
      ]);

      // Surface rate-limit / error if BOTH calls failed
      if (editorial.status !== 200 && organizer.status !== 200) {
        const status = editorial.status || organizer.status;
        if (status === 429) {
          return {
            articles: [],
            totalArticles: 0,
            error: "Rate limit reached. Please try again in a few minutes.",
          };
        }
        return {
          articles: [],
          totalArticles: 0,
          error: `Failed to load events (${status}).`,
        };
      }

      // Merge + dedupe by URL
      const seen = new Set<string>();
      const merged: GNewsArticle[] = [];
      for (const list of [editorial.articles, organizer.articles]) {
        for (const a of list) {
          if (seen.has(a.url)) continue;
          seen.add(a.url);
          merged.push(a);
        }
      }

      // Sort newest-first
      merged.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

      return {
        articles: normalize(merged.slice(0, data.max)),
        totalArticles: merged.length,
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
