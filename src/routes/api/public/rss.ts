import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public RSS feed of the latest articles.
// Lets keyless automation services (IFTTT, Zapier, Feedly, newsletters)
// pick up new stories — e.g. auto-post new articles to X without API keys.

const SITE_URL = "https://fresh-reads.lovable.app";

const GNEWS_BASE = "https://gnews.io/api/v4";

interface GNewsArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}

const querySchema = z.object({
  category: z.string().min(1).max(40).optional(),
});

/** Same stable id scheme as the feed (src/lib/news.functions.ts). */
function makeId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const Route = createFileRoute("/api/public/rss")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = querySchema.safeParse({
          category: new URL(request.url).searchParams.get("category") ?? undefined,
        });
        if (!parsed.success) {
          return new Response("Invalid query parameter", { status: 400 });
        }
        const category = parsed.data.category ?? "technology";

        const apiKey = process.env.GNEWS_API_KEY;
        if (!apiKey) {
          return new Response("Feed temporarily unavailable", { status: 503 });
        }

        try {
          const params = new URLSearchParams({
            category,
            lang: "en",
            max: "15",
            apikey: apiKey,
          });
          const res = await fetch(`${GNEWS_BASE}/top-headlines?${params.toString()}`, {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) {
            console.error("RSS upstream error", res.status);
            return new Response("Upstream feed error", { status: 502 });
          }
          const json = (await res.json()) as { articles?: GNewsArticle[] };
          const items = (json.articles ?? []).slice(0, 15);

          const itemsXml = items
            .map((a) => {
              const id = makeId(a.url);
              const articleUrl = `${SITE_URL}/article/${id}`;
              return [
                "<item>",
                `<title>${esc(a.title)}</title>`,
                `<link>${esc(articleUrl)}</link>`,
                `<guid isPermaLink="true">${esc(articleUrl)}</guid>`,
                `<description>${esc(a.description ?? a.title)}</description>`,
                `<source url="${esc(a.url)}">${esc(a.source?.name ?? "")}</source>`,
                `<pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>`,
                "</item>",
              ].join("");
            })
            .join("\n");

          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Fresh Reads — ${esc(category)}</title>
<link>${SITE_URL}</link>
<description>Latest ${esc(category)} news on Fresh Reads</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<ttl>30</ttl>
${itemsXml}
</channel>
</rss>`;

          return new Response(xml, {
            headers: {
              "Content-Type": "application/rss+xml; charset=utf-8",
              "Cache-Control": "public, max-age=600",
            },
          });
        } catch (err) {
          console.error("RSS feed failed:", err);
          return new Response("Feed error", { status: 502 });
        }
      },
    },
  },
});
