// Live news source registry. Each entry maps to a real upstream provider.
// To add another live provider, implement an adapter that normalizes its
// response into our `Article` shape and call it from `src/server/news.ts`.

export interface NewsSource {
  id: string;
  name: string;
  short: string;
  description: string;
  /** Whether this source is actually wired up right now. */
  live: boolean;
  /** Tailwind text color class for badge accent. */
  accent: string;
}

export const SOURCES: NewsSource[] = [
  {
    id: "gnews",
    name: "GNews",
    short: "GN",
    description: "Aggregated global headlines from 60k+ publishers",
    live: true,
    accent: "text-primary",
  },
];

export const DEFAULT_ENABLED_SOURCES = SOURCES.map((s) => s.id);

const KEY = "newsroom.sources.v1";

export function readEnabledSources(): string[] {
  if (typeof window === "undefined") return DEFAULT_ENABLED_SOURCES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_ENABLED_SOURCES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (x) => typeof x === "string" && SOURCES.some((s) => s.id === x),
      );
      return valid.length ? valid : DEFAULT_ENABLED_SOURCES;
    }
    return DEFAULT_ENABLED_SOURCES;
  } catch {
    return DEFAULT_ENABLED_SOURCES;
  }
}

export function writeEnabledSources(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("sources:changed"));
}
