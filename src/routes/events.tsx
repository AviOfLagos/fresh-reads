import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchEvents } from "@/server/events";
import { useGeolocation } from "@/lib/use-geolocation";
import { cacheArticles } from "@/lib/article-cache";

const POPULAR_CITIES = [
  { city: "Lagos", country: "ng", label: "Lagos · Nigeria" },
  { city: "Abuja", country: "ng", label: "Abuja · Nigeria" },
  { city: "Nairobi", country: "ke", label: "Nairobi · Kenya" },
  { city: "Cape Town", country: "za", label: "Cape Town · South Africa" },
  { city: "Accra", country: "gh", label: "Accra · Ghana" },
] as const;

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Tech Events — Lagos & Africa | Newsroom" },
      {
        name: "description",
        content:
          "Upcoming tech events, conferences, hackathons, and meetups in Lagos, Nigeria, and across Africa.",
      },
    ],
  }),
});

function EventsPage() {
  const geo = useGeolocation();
  const [city, setCity] = useState<string>("Lagos");
  const [country, setCountry] = useState<string>("ng");

  // If geolocation succeeds, gently switch to the user's city — but only
  // if they haven't manually picked a different one.
  const [autoApplied, setAutoApplied] = useState(false);
  useEffect(() => {
    if (!autoApplied && geo.status === "ok" && geo.city && geo.country) {
      setCity(geo.city);
      setCountry(geo.country);
      setAutoApplied(true);
    }
  }, [geo.status, geo.city, geo.country, autoApplied]);

  const query = useQuery({
    queryKey: ["events", city, country],
    queryFn: async () => {
      const res = await fetchEvents({
        data: { city, country, topic: "tech", max: 15 },
      });
      if (res.error) throw new Error(res.error);
      return res;
    },
  });

  useEffect(() => {
    if (query.data?.articles?.length) {
      cacheArticles(query.data.articles);
    }
  }, [query.data]);

  const articles = query.data?.articles ?? [];

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="mb-4 border-b border-border pb-3 sm:mb-6 sm:pb-4">
        <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-1 flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>Tech events</span>
        </div>
        <h1 className="headline text-2xl font-bold sm:text-3xl md:text-4xl">
          What's happening in {city}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Upcoming tech conferences, hackathons, meetups, and developer events near you.
        </p>
      </div>

      {/* Location controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
        <button
          type="button"
          onClick={geo.request}
          disabled={geo.status === "asking"}
          className="inline-flex items-center gap-1.5 border border-border bg-surface px-2.5 py-1.5 ticker-text text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {geo.status === "asking" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <MapPin className="h-3 w-3" />
          )}
          {geo.status === "ok" && geo.city
            ? `Near you · ${geo.city}`
            : "Use my location"}
        </button>

        <div className="flex flex-wrap gap-1.5">
          {POPULAR_CITIES.map((c) => {
            const active = c.city.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={c.city}
                type="button"
                onClick={() => {
                  setCity(c.city);
                  setCountry(c.country);
                  setAutoApplied(true); // user picked manually
                }}
                className={[
                  "border px-2.5 py-1.5 ticker-text text-[10px] uppercase tracking-widest transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {geo.status === "denied" && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Location permission denied. Pick a city below instead.
        </div>
      )}

      {/* Events list */}
      {query.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 skeleton" />
          ))}
        </div>
      )}

      {query.isError && (
        <div className="border border-border bg-surface p-4 text-sm text-muted-foreground">
          Couldn't load events: {query.error instanceof Error ? query.error.message : "unknown error"}
          <button
            onClick={() => query.refetch()}
            className="ml-2 underline hover:text-foreground"
          >
            Retry
          </button>
        </div>
      )}

      {!query.isLoading && !query.isError && articles.length === 0 && (
        <div className="border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          <Calendar className="mx-auto mb-2 h-6 w-6 opacity-40" />
          <p>No upcoming tech events found for {city} right now.</p>
          <p className="mt-1 text-xs opacity-70">
            Try a different city, or check back tomorrow.
          </p>
        </div>
      )}

      {articles.length > 0 && (
        <ul className="divide-y divide-border border border-border bg-surface">
          {articles.map((a, i) => {
            let when = "recently";
            try {
              when = formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true });
            } catch { /* ignore */ }
            return (
              <li
                key={a.id}
                className="p-3 sm:p-4 animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  {a.image && (
                    <Link
                      to="/article/$id"
                      params={{ id: a.id }}
                      className="aspect-[16/10] w-full overflow-hidden bg-muted sm:w-40 sm:shrink-0"
                    >
                      <img
                        src={a.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform hover:scale-105"
                      />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="bg-primary px-1.5 py-0.5 text-primary-foreground">
                        {a.source.name}
                      </span>
                      <span>{when}</span>
                    </div>
                    <Link
                      to="/article/$id"
                      params={{ id: a.id }}
                      className="block headline text-base font-semibold leading-snug hover:text-primary transition-colors sm:text-lg"
                    >
                      {a.title}
                    </Link>
                    {a.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3">
                        {a.description}
                      </p>
                    )}
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open original
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground/80 leading-relaxed">
        Events are surfaced from real news coverage and announcements via GNews.
        Always confirm dates and venues with the organizer before attending.
      </p>
    </div>
  );
}
