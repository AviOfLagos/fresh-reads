// Mock multi-source registry. In production these IDs would map to
// adapters that normalize each provider's response into our `Article` shape.
// See docs/multi-source.md for the real implementation plan.

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
    description: "Aggregated global headlines (live)",
    live: true,
    accent: "text-primary",
  },
  {
    id: "guardian",
    name: "The Guardian",
    short: "GU",
    description: "Long-form analysis & investigations (mock)",
    live: false,
    accent: "text-accent",
  },
  {
    id: "reuters",
    name: "Reuters",
    short: "RT",
    description: "Wire service breaking news (mock)",
    live: false,
    accent: "text-foreground",
  },
  {
    id: "ap",
    name: "Associated Press",
    short: "AP",
    description: "Verified, neutral wire reporting (mock)",
    live: false,
    accent: "text-foreground",
  },
  {
    id: "bbc",
    name: "BBC News",
    short: "BB",
    description: "International public broadcaster (mock)",
    live: false,
    accent: "text-foreground",
  },
  {
    id: "newsapi",
    name: "NewsAPI.org",
    short: "NA",
    description: "Multi-publisher aggregator (mock)",
    live: false,
    accent: "text-foreground",
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
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
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
