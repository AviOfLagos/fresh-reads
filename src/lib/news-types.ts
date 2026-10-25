export interface Article {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
  /** Watchfire items: "confirmed" (advisory / the researchers) or "reported" (press). */
  status?: "confirmed" | "reported";
  severity?: "critical" | "high" | "info";
  /** One concrete step for the reader, when there is one. */
  action?: string;
  topics?: string[];
}

export interface NewsResponse {
  articles: Article[];
  totalArticles: number;
  error: string | null;
}

// Watchfire: what developers should know about, and what to do. Every tab but
// "technology" reads the Watchfire feed (advisory databases, the researchers
// who find supply-chain malware, security press); "technology" is GNews.
// "ai-platforms" is the official news of the AI platforms developers build
// on — releases, deprecations, outages — and stays out of "All alerts".
export const CATEGORIES = [
  { id: "security", label: "All alerts" },
  { id: "npm", label: "npm" },
  { id: "pypi", label: "Python" },
  { id: "rust", label: "Rust" },
  { id: "go", label: "Go" },
  { id: "ai-tools", label: "AI tools" },
  { id: "ci-cd", label: "CI/CD" },
  { id: "vulns", label: "Exploited & critical" },
  { id: "ai-platforms", label: "AI platforms" },
  { id: "snare", label: "snare" },
  { id: "technology", label: "Tech news" },
] as const;

export const WATCHFIRE_FEED = "https://nexlabz.github.io/watchfire-feed/news.json";

export type CategoryId = (typeof CATEGORIES)[number]["id"];
