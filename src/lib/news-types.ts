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
}

export interface NewsResponse {
  articles: Article[];
  totalArticles: number;
  error: string | null;
}

export const CATEGORIES = [
  { id: "general", label: "Top Stories" },
  { id: "business", label: "Business" },
  { id: "technology", label: "Technology" },
  { id: "world", label: "World" },
  { id: "sports", label: "Sports" },
  { id: "science", label: "Science" },
  { id: "health", label: "Health" },
  { id: "entertainment", label: "Entertainment" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
