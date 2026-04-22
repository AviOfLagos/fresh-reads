# Multi-Source News Aggregation

> Status: **UI prototype with mock sources.** Live source: GNews. Mock sources:
> The Guardian, Reuters, Associated Press, BBC News, NewsAPI.org.

## Goal

Let a user enable/disable any combination of providers and see a single,
de-duplicated, time-ordered feed where each article is clearly attributed.

## Current prototype

- `src/lib/sources.ts` — registry of sources and `localStorage` persistence
  of the user's enabled set.
- `src/components/source-filter.tsx` — chip toggle row, marked **mock** for
  any source we haven't wired yet.
- `src/routes/index.tsx` — when a mock source is enabled, the page
  re-attributes a slice of GNews articles to that source so the feed visibly
  changes. This is purely cosmetic so reviewers can interact with the toggle.

## Production plan

### 1. One adapter per provider

Each provider differs in auth, rate limits, query shape, and response schema.
Wrap each in a small server-only module that returns our `Article[]` shape:

```
src/server/sources/
  gnews.ts        ← already implemented
  guardian.ts     ← Guardian Open Platform, key in env
  reuters.ts      ← via a paid wire reseller or RSS
  ap.ts           ← AP Media API
  bbc.ts          ← BBC RSS / News API
  newsapi.ts      ← newsapi.org (server-side only — their CORS forbids browser use)
```

Each adapter exports:

```ts
export interface SourceAdapter {
  id: string;
  fetchTopHeadlines(opts: { category: string; lang: string; max: number }): Promise<Article[]>;
  fetchSearch(opts: { query: string; lang: string; max: number }): Promise<Article[]>;
}
```

### 2. Aggregation server function

Replace `fetchNews` with `fetchAggregatedNews` in `src/server/news.ts`:

```ts
export const fetchAggregatedNews = createServerFn({ method: "GET" })
  .inputValidator(input => schema.parse(input))
  .handler(async ({ data }) => {
    const wanted = data.sources; // string[] of source ids
    const adapters = wanted.map(id => REGISTRY[id]).filter(Boolean);
    const settled = await Promise.allSettled(
      adapters.map(a => a.fetchTopHeadlines({
        category: data.category,
        lang: data.lang,
        max: Math.ceil(data.max / adapters.length),
      })),
    );
    // Collect successes, log failures (don't fail the whole request).
    const all = settled.flatMap(r => r.status === "fulfilled" ? r.value : []);
    return {
      articles: dedupe(all).sort(byPublishedDesc).slice(0, data.max),
      partial: settled.some(r => r.status === "rejected"),
      perSourceErrors: settled.map((r, i) => r.status === "rejected" ? { id: wanted[i], message: String(r.reason) } : null).filter(Boolean),
    };
  });
```

### 3. De-duplication

Identical stories often appear from multiple wires. Two passes:

1. **URL canonicalization** — strip tracking params (`utm_*`, `ref`,
   `fbclid`), normalize protocol + trailing slash. Hash → primary dedupe key.
2. **Fuzzy title match** — within a 2-hour window, group articles whose
   titles have ≥ 0.85 Jaccard similarity on tokenized terms. Keep the most
   detailed entry; attach the others as `relatedSources`.

### 4. Caching & rate-limit safety

- Cache aggregator results by `(sources joined, category, lang)` for 60s in
  the server function via a tiny in-memory LRU. The Worker runtime is
  short-lived so this is best-effort, not a guarantee.
- Each adapter respects its own rate limits and degrades gracefully — a
  failed adapter returns `[]` and is logged. The feed UI shows a soft warning
  if `partial: true`.

### 5. Secrets

Each provider key is added via the secrets tool and read with `process.env`
inside its adapter only. Never imported into client code.

| Provider     | Env var              |
| ------------ | -------------------- |
| GNews        | `GNEWS_API_KEY`      |
| The Guardian | `GUARDIAN_API_KEY`   |
| AP           | `AP_API_KEY`         |
| NewsAPI      | `NEWSAPI_KEY`        |

### 6. UI changes (already prototyped)

- Source filter chips with live/mock badges.
- Per-card source attribution (already shown).
- Optional grouped view: "5 sources reported on this story" with
  expand-to-see-all (built on top of `relatedSources`).
