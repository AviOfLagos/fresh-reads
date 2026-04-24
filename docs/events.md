# Tech Events (Lagos / Africa)

> Status: **Live.** A geolocation-aware events page (`/events`) surfaces
> upcoming tech events from real news coverage. See `src/routes/events.tsx`,
> `src/server/events.ts`, and `src/lib/use-geolocation.ts`.

## What it does

- Defaults to **Lagos, Nigeria** with quick-pick chips for Abuja, Nairobi,
  Cape Town, and Accra.
- "Use my location" button asks for the browser's geolocation, reverse-geocodes
  via [BigDataCloud's free, key-less endpoint](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api),
  and switches the feed to the user's city for 7 days (cached in localStorage).
- Calls GNews `search` server-side with a focused query like
  `"Lagos" AND (tech OR startup OR developer) AND (event OR conference OR hackathon OR meetup OR summit OR workshop OR fair)`
  scoped to the country code (`ng`, `ke`, `za`, `gh`, …).

## Why news, not a true events API

We evaluated and ruled out:

| Source           | Verdict |
| ---------------- | ------- |
| **Eventbrite Search API** | Discontinued in **2020** for third-party developers. Public listing pages still exist but require scraping. |
| **tix.africa**   | No public API. |
| **Ticketmaster Discovery** | Free tier covers Nigeria but is dominated by concerts/sports — almost no tech events. |
| **PredictHQ**    | Best structured-events data, but **paid** (no free tier). |

GNews is already wired up, free, and surfaces real announcements (DevFest
Lagos, Lagos Startup Week, GitHub Constellation, etc.) the same day they
appear in the press.

## Production upgrade path

When the project takes paid traffic, swap `fetchEvents` for a structured
provider in this priority:

1. **PredictHQ Events API** — best fidelity, ICS-style records with venue,
   geo coords, predicted attendance. Add `PREDICTHQ_TOKEN` as a secret.
2. **Firecrawl scrape of `eventbrite.com/d/nigeria--lagos/tech--events/`**
   on a daily cron via Lovable Cloud. Persist into a new `events` table.
3. **Crowdsourced submissions** — let signed-in users with `verified` role
   submit events; auto-publish, moderators can hide. Reuse the same
   `article_evidence` UI shell.

The frontend would not need to change — only `fetchEvents` would point at a
table query instead of the GNews proxy.

## Geolocation

- Uses the standard Web Geolocation API; permission is **opt-in only**.
- Reverse geocoding uses BigDataCloud's `reverse-geocode-client` endpoint
  (no API key required, free tier sufficient).
- Cached `{city, country}` in `localStorage` for 7 days to avoid prompting
  on every visit.
- If the user denies, we fall back to the manual city chips. We never store
  raw lat/lng anywhere.
