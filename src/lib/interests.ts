// User interests / personalization preferences.
// Stored locally for now; could sync to Lovable Cloud per-user later.

import type { CategoryId } from "@/lib/news-types";

export interface UserInterests {
  /** Selected news categories the user cares about. */
  categories: CategoryId[];
  /** Free-form topic keywords (hobbies, work, interests). */
  topics: string[];
  /** Country / region for geographic relevance, e.g. "us", "gb". */
  country: string | null;
  /** Optional city / region label shown in UI. */
  locationLabel: string | null;
  /** ISO timestamp when user last saved (or skipped) the modal. */
  updatedAt: string | null;
  /** True if the user has explicitly skipped or saved at least once. */
  configured: boolean;
}

export const DEFAULT_INTERESTS: UserInterests = {
  categories: [],
  topics: [],
  country: null,
  locationLabel: null,
  updatedAt: null,
  configured: false,
};

// Curated topic suggestions across hobbies, work, lifestyle.
export const TOPIC_SUGGESTIONS = [
  "AI",
  "Startups",
  "Crypto",
  "Climate",
  "Space",
  "Football",
  "Formula 1",
  "Basketball",
  "Cycling",
  "Hiking",
  "Photography",
  "Gaming",
  "Movies",
  "Music",
  "Cooking",
  "Travel",
  "Fashion",
  "Stock Market",
  "Real Estate",
  "Productivity",
  "Design",
  "Programming",
  "Cybersecurity",
  "Healthcare",
  "Education",
  "Politics",
  "Books",
  "EVs",
];

// Common country codes for GNews. Expandable.
export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
  { code: "in", label: "India" },
  { code: "ng", label: "Nigeria" },
  { code: "za", label: "South Africa" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
  { code: "it", label: "Italy" },
  { code: "br", label: "Brazil" },
  { code: "mx", label: "Mexico" },
  { code: "jp", label: "Japan" },
  { code: "kr", label: "South Korea" },
  { code: "cn", label: "China" },
  { code: "ae", label: "United Arab Emirates" },
];

const KEY = "newsroom.interests.v1";

export function readInterests(): UserInterests {
  if (typeof window === "undefined") return DEFAULT_INTERESTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_INTERESTS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_INTERESTS,
      ...parsed,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    };
  } catch {
    return DEFAULT_INTERESTS;
  }
}

export function writeInterests(next: UserInterests) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("interests:changed"));
}

/** Build a GNews search query string from user topics. */
export function topicsToQuery(topics: string[]): string {
  if (!topics.length) return "";
  // Quote multi-word topics, OR them together.
  return topics
    .slice(0, 8)
    .map((t) => (t.includes(" ") ? `"${t}"` : t))
    .join(" OR ");
}
