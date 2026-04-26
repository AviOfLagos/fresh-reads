import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  MapPin,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Filter,
  X,
  ArrowUpDown,
  RefreshCw,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { fetchEvents, type EventType } from "@/server/events";
import { useGeolocation } from "@/lib/use-geolocation";
import { cacheArticles } from "@/lib/article-cache";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

// LocalStorage key for persisting the user's quick-filter + sort state.
const PREFS_KEY = "events:prefs:v1";

interface StoredPrefs {
  city?: string;
  country?: string;
  eventType?: EventType;
  fromDate?: string;
  toDate?: string;
  sort?: SortMode;
}

function loadPrefs(): StoredPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPrefs;
  } catch {
    return null;
  }
}

function savePrefs(p: StoredPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* quota or disabled — silently ignore */
  }
}

// Shared focus ring for chip-style controls — keyboard-only via focus-visible.
const CHIP_FOCUS =
  "focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const POPULAR_CITIES = [
  { city: "Lagos", country: "ng", label: "Lagos · Nigeria" },
  { city: "Abuja", country: "ng", label: "Abuja · Nigeria" },
  { city: "Nairobi", country: "ke", label: "Nairobi · Kenya" },
  { city: "Cape Town", country: "za", label: "Cape Town · South Africa" },
  { city: "Accra", country: "gh", label: "Accra · Ghana" },
] as const;

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "conference", label: "Conference" },
  { id: "meetup", label: "Meetup" },
  { id: "hackathon", label: "Hackathon" },
  { id: "workshop", label: "Workshop" },
  { id: "summit", label: "Summit" },
];

type SortMode = "soonest" | "newest" | "relevance";

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: "soonest", label: "Soonest" },
  { id: "newest", label: "Newest" },
  { id: "relevance", label: "Relevance" },
];

type DatePreset = "any" | "today" | "week" | "month";

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetToRange(preset: DatePreset): { from: string; to: string } {
  if (preset === "any") return { from: "", to: "" };
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  if (preset === "today") {
    // from = now, to = +1 day to include events later today
    to.setDate(to.getDate() + 1);
  } else if (preset === "week") {
    to.setDate(to.getDate() + 7);
  } else if (preset === "month") {
    to.setMonth(to.getMonth() + 1);
  }
  return { from: isoDate(from), to: isoDate(to) };
}

function rangeToPreset(from: string, to: string): DatePreset {
  if (!from && !to) return "any";
  const candidates: DatePreset[] = ["today", "week", "month"];
  for (const p of candidates) {
    const r = presetToRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return "any";
}

// Lightweight relevance scorer — favours items whose title/description contain
// strong "future event" language and matches the active event type vocabulary.
const RELEVANCE_TERMS = [
  "register",
  "rsvp",
  "tickets",
  "join us",
  "announces",
  "upcoming",
  "save the date",
  "agenda",
  "keynote",
  "speakers",
  "eventbrite",
  "lu.ma",
  "luma",
  "meetup.com",
  "tix.africa",
];

function relevanceScore(
  text: string,
  eventType: EventType,
  typeVocab: string[],
): number {
  const t = text.toLowerCase();
  let score = 0;
  for (const term of RELEVANCE_TERMS) {
    if (t.includes(term)) score += 2;
  }
  for (const term of typeVocab) {
    if (t.includes(term)) score += eventType === "all" ? 1 : 3;
  }
  return score;
}

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

  // Hydrate from localStorage on first render so we render the same view
  // the user left behind. Defaults are Lagos / NG / soonest.
  const initial = useMemo(() => loadPrefs() ?? {}, []);

  // Location
  const [city, setCity] = useState<string>(initial.city ?? "Lagos");
  const [country, setCountry] = useState<string>(initial.country ?? "ng");
  const [customCity, setCustomCity] = useState<string>("");

  // Filters
  const [eventType, setEventType] = useState<EventType>(initial.eventType ?? "all");
  const [fromDate, setFromDate] = useState<string>(initial.fromDate ?? "");
  const [toDate, setToDate] = useState<string>(initial.toDate ?? "");
  const [sort, setSort] = useState<SortMode>(initial.sort ?? "soonest");

  // If we hydrated stored prefs, treat that as a manual choice so geolocation
  // doesn't quietly overwrite the user's last city.
  const [autoApplied, setAutoApplied] = useState(
    !!(initial.city && initial.country),
  );
  useEffect(() => {
    if (!autoApplied && geo.status === "ok" && geo.city && geo.country) {
      setCity(geo.city);
      setCountry(geo.country);
      setAutoApplied(true);
    }
  }, [geo.status, geo.city, geo.country, autoApplied]);

  // Persist whenever any tracked pref changes.
  useEffect(() => {
    savePrefs({ city, country, eventType, fromDate, toDate, sort });
  }, [city, country, eventType, fromDate, toDate, sort]);

  const query = useQuery({
    queryKey: ["events", city, country, eventType, fromDate, toDate],
    queryFn: async () => {
      const res = await fetchEvents({
        data: {
          city,
          country,
          topic: "tech",
          max: 20,
          eventType,
          fromDate: fromDate || null,
          toDate: toDate || null,
        },
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

  // Pull-to-refresh — only active on touch devices.
  // If the underlying refetch fails (rate limit, offline), surface a
  // friendly toast with a one-tap retry instead of failing silently.
  const refetch = useCallback(async () => {
    try {
      const result = await query.refetch();
      if (result.error) throw result.error;
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't refresh events. Check your connection.";
      toast.error("Refresh failed", {
        description: message,
        action: {
          label: "Retry",
          onClick: () => {
            void refetch();
          },
        },
      });
    }
  }, [query]);
  const ptr = usePullToRefresh(refetch);

  // Track "just toggled" chip ids to play a one-off pop animation.
  // Stored as a key like "type:meetup" or "date:week" or "sort:newest".
  const [poppedKey, setPoppedKey] = useState<string | null>(null);
  const popTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pop = useCallback((key: string) => {
    setPoppedKey(key);
    if (popTimer.current) clearTimeout(popTimer.current);
    popTimer.current = setTimeout(() => setPoppedKey(null), 320);
  }, []);
  useEffect(
    () => () => {
      if (popTimer.current) clearTimeout(popTimer.current);
    },
    [],
  );

  const rawArticles = query.data?.articles ?? [];

  const typeVocab = useMemo(() => {
    if (eventType === "all")
      return ["event", "conference", "hackathon", "meetup", "summit", "workshop"];
    const map: Record<Exclude<EventType, "all">, string[]> = {
      conference: ["conference", "summit", "expo"],
      meetup: ["meetup", "meet-up", "gathering"],
      hackathon: ["hackathon", "hack day", "buildathon"],
      workshop: ["workshop", "training", "bootcamp"],
      summit: ["summit", "forum", "convention"],
    };
    return map[eventType];
  }, [eventType]);

  const articles = useMemo(() => {
    const list = [...rawArticles];
    if (sort === "newest") {
      list.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
    } else if (sort === "soonest") {
      // GNews returns news ABOUT events, not the event date itself.
      // Best proxy: most recently published announcements are most likely
      // to describe the soonest upcoming events. Tie-break by relevance.
      list.sort((a, b) => {
        const dt =
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        if (dt !== 0) return dt;
        const sa = relevanceScore(`${a.title} ${a.description ?? ""}`, eventType, typeVocab);
        const sb = relevanceScore(`${b.title} ${b.description ?? ""}`, eventType, typeVocab);
        return sb - sa;
      });
    } else {
      list.sort((a, b) => {
        const sa = relevanceScore(`${a.title} ${a.description ?? ""}`, eventType, typeVocab);
        const sb = relevanceScore(`${b.title} ${b.description ?? ""}`, eventType, typeVocab);
        if (sb !== sa) return sb - sa;
        return (
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime()
        );
      });
    }
    return list;
  }, [rawArticles, sort, eventType, typeVocab]);

  const hasFilters = useMemo(
    () => eventType !== "all" || !!fromDate || !!toDate,
    [eventType, fromDate, toDate],
  );

  const activeDatePreset = useMemo(
    () => rangeToPreset(fromDate, toDate),
    [fromDate, toDate],
  );

  const applyDatePreset = (preset: DatePreset) => {
    const r = presetToRange(preset);
    setFromDate(r.from);
    setToDate(r.to);
    pop(`date:${preset}`);
  };

  const setEventTypeWithPop = (next: EventType, prefix: "type" | "quick") => {
    setEventType(next);
    pop(`${prefix}:${next}`);
  };

  const setSortWithPop = (next: SortMode) => {
    setSort(next);
    pop(`sort:${next}`);
  };

  // Snapshot current filter/sort state and offer a one-tap Undo via toast.
  const offerUndo = (label: string, prev: StoredPrefs) => {
    toast(label, {
      description: "Tap undo to restore your previous view.",
      action: {
        label: "Undo",
        onClick: () => {
          if (prev.eventType !== undefined) setEventType(prev.eventType);
          if (prev.fromDate !== undefined) setFromDate(prev.fromDate);
          if (prev.toDate !== undefined) setToDate(prev.toDate);
          if (prev.sort !== undefined) setSort(prev.sort);
          toast.success("Restored your previous view");
        },
      },
    });
  };

  const clearFilters = () => {
    const snapshot: StoredPrefs = { eventType, fromDate, toDate };
    const wasActive =
      eventType !== "all" || !!fromDate || !!toDate;
    setEventType("all");
    setFromDate("");
    setToDate("");
    pop("clear");
    if (wasActive) offerUndo("Filters cleared", snapshot);
  };

  const resetAll = () => {
    const snapshot: StoredPrefs = { eventType, fromDate, toDate, sort };
    const wasActive =
      eventType !== "all" || !!fromDate || !!toDate || sort !== "soonest";
    setEventType("all");
    setFromDate("");
    setToDate("");
    setSort("soonest");
    pop("reset");
    if (wasActive) offerUndo("Events view reset", snapshot);
  };

  const submitCustomCity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCity.trim();
    if (trimmed.length < 2) return;
    setCity(trimmed);
    setAutoApplied(true);
    setCustomCity("");
  };

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 sm:px-4 sm:py-6 md:py-8">
      {/* Pull-to-refresh indicator (touch only) */}
      {(ptr.pull > 0 || ptr.refreshing) && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center"
          style={{
            transform: `translateY(${Math.min(ptr.pull, ptr.threshold + 8)}px)`,
            transition: ptr.refreshing ? "transform 200ms ease-out" : "none",
          }}
          aria-hidden={!ptr.refreshing}
        >
          <div
            className={[
              "mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 ticker-text text-[10px] uppercase tracking-widest shadow-sm",
              ptr.progress >= 1 || ptr.refreshing
                ? "text-primary border-primary"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {ptr.refreshing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowDown
                className="h-3 w-3 transition-transform duration-200"
                style={{
                  transform: `rotate(${ptr.progress >= 1 ? 180 : 0}deg)`,
                }}
              />
            )}
            {ptr.refreshing
              ? "Refreshing…"
              : ptr.progress >= 1
                ? "Release to refresh"
                : "Pull to refresh"}
          </div>
        </div>
      )}

      <div className="mb-4 border-b border-border pb-3 sm:mb-6 sm:pb-4">
        <div className="ticker-text text-[10px] uppercase tracking-widest text-primary mb-1 flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          <span>Tech events</span>
        </div>
        <h1 className="headline text-2xl font-bold sm:text-3xl md:text-4xl">
          What's happening in {city}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Upcoming tech conferences, hackathons, meetups, and developer events
          near you.
        </p>
      </div>

      {/* Location controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
                  setAutoApplied(true);
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

      {/* Custom city + country */}
      <form
        onSubmit={submitCustomCity}
        className="mb-3 flex flex-wrap items-center gap-2"
      >
        <input
          value={customCity}
          onChange={(e) => setCustomCity(e.target.value)}
          placeholder="Other city…"
          maxLength={60}
          className="border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          aria-label="Country"
          className="border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
        >
          <option value="ng">Nigeria</option>
          <option value="ke">Kenya</option>
          <option value="za">South Africa</option>
          <option value="gh">Ghana</option>
          <option value="eg">Egypt</option>
          <option value="us">United States</option>
          <option value="gb">United Kingdom</option>
          <option value="in">India</option>
        </select>
        <button
          type="submit"
          disabled={customCity.trim().length < 2}
          className="inline-flex items-center gap-1 bg-primary px-2.5 py-1.5 ticker-text text-[10px] uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Go
        </button>
      </form>

      {/* Quick chips — toggle date range & event type without opening filters */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter events by date range"
        >
          <span
            id="events-date-label"
            className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mr-0.5"
          >
            When
          </span>
          {DATE_PRESETS.map((p) => {
            const active = activeDatePreset === p.id;
            const popped = poppedKey === `date:${p.id}`;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className={[
                  "border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-all duration-200 will-change-transform",
                  CHIP_FOCUS,
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  popped ? "animate-chip-pop" : "",
                ].join(" ")}
                aria-pressed={active}
                aria-label={`Show events for ${p.label.toLowerCase()}${active ? " (selected)" : ""}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter events by type"
        >
          <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground mr-0.5">
            Type
          </span>
          {EVENT_TYPES.map((t) => {
            const active = t.id === eventType;
            const popped = poppedKey === `quick:${t.id}`;
            return (
              <button
                key={`quick-${t.id}`}
                type="button"
                onClick={() => setEventTypeWithPop(t.id, "quick")}
                className={[
                  "border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-all duration-200 will-change-transform",
                  CHIP_FOCUS,
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  popped ? "animate-chip-pop" : "",
                ].join(" ")}
                aria-pressed={active}
                aria-label={`Filter by ${t.label} events${active ? " (selected)" : ""}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <label
          htmlFor="events-sort-select"
          className={[
            "ml-auto inline-flex items-center gap-1.5 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground border px-1.5 py-0.5 transition-all duration-200 will-change-transform",
            poppedKey?.startsWith("sort:")
              ? "border-primary text-primary animate-chip-pop"
              : "border-transparent",
          ].join(" ")}
        >
          <ArrowUpDown
            className={[
              "h-3 w-3 transition-transform duration-300",
              poppedKey?.startsWith("sort:") ? "rotate-180 text-primary" : "",
            ].join(" ")}
          />
          Sort
          <select
            id="events-sort-select"
            value={sort}
            onChange={(e) => setSortWithPop(e.target.value as SortMode)}
            aria-label={`Sort events. Currently sorted by ${SORT_OPTIONS.find((o) => o.id === sort)?.label}`}
            className={[
              "border border-border bg-background px-1.5 py-1 text-xs text-foreground",
              CHIP_FOCUS,
              "focus-visible:border-primary",
            ].join(" ")}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Filters */}
      <div className="mb-4 border border-border bg-surface p-3 sm:mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            <Filter className="h-3 w-3" />
            Filters
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        <div
          className="mb-2 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter events by type"
        >
          {EVENT_TYPES.map((t) => {
            const active = t.id === eventType;
            const popped = poppedKey === `type:${t.id}`;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setEventTypeWithPop(t.id, "type")}
                className={[
                  "border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest transition-all duration-200 will-change-transform",
                  CHIP_FOCUS,
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  popped ? "animate-chip-pop" : "",
                ].join(" ")}
                aria-pressed={active}
                aria-label={`Filter by ${t.label} events${active ? " (selected)" : ""}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            From
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              max={toDate || undefined}
              className="ml-1.5 border border-border bg-background px-1.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            To
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              min={fromDate || undefined}
              className="ml-1.5 border border-border bg-background px-1.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </div>

      {geo.status === "denied" && (
        <div className="mb-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Location permission denied. Pick a city above instead.
        </div>
      )}

      {/* Loading — initial fetch shows full skeleton list.
          Background refetches (filter/sort changes) overlay a slim status bar
          on top of the existing list so the page doesn't flash empty. */}
      {query.isLoading && (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          <div className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading events for {city}…
          </div>
          <ul className="divide-y divide-border border border-border bg-surface">
            {Array.from({ length: 5 }).map((_, i) => (
              <li
                key={i}
                className="p-3 sm:p-4 animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <div className="aspect-[16/10] w-full skeleton sm:w-40 sm:shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-16 skeleton" />
                      <div className="h-3 w-20 skeleton" />
                    </div>
                    <div className="h-4 w-11/12 skeleton" />
                    <div className="h-4 w-3/4 skeleton" />
                    <div className="h-3 w-full skeleton" />
                    <div className="h-3 w-5/6 skeleton" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error */}
      {query.isError && (
        <div className="border border-border bg-surface p-4 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-1.5 text-foreground mb-1">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Couldn't load events
          </div>
          <p className="text-xs">
            {query.error instanceof Error ? query.error.message : "Unknown error."}
          </p>
          <button
            onClick={() => query.refetch()}
            className="mt-2 inline-flex items-center gap-1 border border-border bg-background px-2 py-1 ticker-text text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty — friendly state with quick reset actions */}
      {!query.isLoading && !query.isError && articles.length === 0 && (
        <div className="border border-border bg-surface p-6 text-center text-sm text-muted-foreground animate-fade-up">
          <Calendar className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-foreground font-medium">
            No events match your filters
          </p>
          <p className="mt-1 text-xs">
            We couldn't find any{" "}
            {eventType !== "all" ? (
              <span className="text-foreground">{eventType}</span>
            ) : (
              "tech"
            )}{" "}
            events in <span className="text-foreground">{city}</span>
            {(fromDate || toDate) && (
              <>
                {" "}
                between{" "}
                <span className="text-foreground">{fromDate || "any"}</span>{" "}
                and <span className="text-foreground">{toDate || "any"}</span>
              </>
            )}
            . Try widening your filters or picking another city.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 ticker-text text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
            {sort !== "soonest" && (
              <button
                onClick={() => setSortWithPop("soonest")}
                className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 ticker-text text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
              >
                <ArrowUpDown className="h-3 w-3" />
                Sort by soonest
              </button>
            )}
            {(hasFilters || sort !== "soonest") && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1 border border-primary bg-primary/10 text-primary px-2 py-1 ticker-text text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset everything
              </button>
            )}
            <button
              onClick={() => query.refetch()}
              className="inline-flex items-center gap-1 border border-border bg-background px-2 py-1 ticker-text text-[10px] uppercase tracking-widest hover:border-primary hover:text-primary transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {articles.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {query.isFetching && !query.isLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
              {articles.length} {articles.length === 1 ? "event" : "events"}
            </span>
            <span className="opacity-80 inline-flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Sorted by {SORT_OPTIONS.find((o) => o.id === sort)?.label}
            </span>
          </div>
          {/* Re-key the list whenever sort/filters/city change so cards
              remount and replay the staggered entrance animation. */}
          <ul
            key={`${city}|${country}|${eventType}|${fromDate}|${toDate}|${sort}`}
            className="divide-y divide-border border border-border bg-surface"
          >
            {articles.map((a, i) => {
              let when = "recently";
              try {
                when = formatDistanceToNow(new Date(a.publishedAt), {
                  addSuffix: true,
                });
              } catch {
                /* ignore */
              }
              return (
                <li
                  key={a.id}
                  className="p-3 sm:p-4 animate-fade-up"
                  style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
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
        </>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground/80 leading-relaxed">
        Events are surfaced from real news coverage and announcements
        (including mentions of Eventbrite, tix.africa, Lu.ma, and Meetup.com)
        via GNews. Always confirm dates and venues with the organizer before
        attending.
      </p>
    </div>
  );
}
