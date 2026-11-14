import { createFileRoute } from "@tanstack/react-router";
import { CATEGORIES, SITE_URL, WATCHFIRE_FEED } from "@/lib/news-types";

// /sitemap.xml: the tabs, plus every Watchfire article still in the feed
// (it keeps 30 days). GNews items have no page of their own to index.

interface FeedItem {
  id: string;
  published: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let items: FeedItem[] = [];
        try {
          const res = await fetch(process.env.WATCHFIRE_FEED_URL || WATCHFIRE_FEED);
          if (res.ok) items = ((await res.json()) as { items?: FeedItem[] }).items ?? [];
        } catch (err) {
          console.error("sitemap: feed failed:", err);
        }
        const tabs = CATEGORIES.filter((c) => c.id !== "technology").map((c) =>
          c.id === "security" ? `${SITE_URL}/` : `${SITE_URL}/?category=${c.id}`,
        );
        const urls = [
          ...tabs.map((loc) => `<url><loc>${esc(loc)}</loc><changefreq>hourly</changefreq></url>`),
          ...items.map(
            (i) =>
              `<url><loc>${esc(`${SITE_URL}/article/wf-${i.id}`)}</loc>` +
              (i.published ? `<lastmod>${esc(i.published)}</lastmod>` : "") +
              `</url>`,
          ),
        ];
        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          urls.join("") +
          "</urlset>";
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=900, s-maxage=900",
          },
        });
      },
    },
  },
});
