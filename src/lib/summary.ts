// Mock summary generator. In production this calls the Lovable AI Gateway.
// Real implementation plan: docs/ai-summary.md

import type { Article } from "./news-types";

export interface ArticleSummary {
  tldr: string;
  bullets: string[];
  whyItMatters: string;
  readingTimeSeconds: number;
}

function pickSentences(text: string, n: number): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  return parts.slice(0, n);
}

export function mockSummarize(article: Article): ArticleSummary {
  const source = [article.description, article.content, article.title]
    .filter(Boolean)
    .join(" ");
  const sentences = pickSentences(source, 4);
  const tldr =
    sentences[0] ||
    `${article.title} — a developing story from ${article.source.name}.`;

  const bullets =
    sentences.slice(1, 4).length >= 2
      ? sentences.slice(1, 4)
      : [
          `Reported by ${article.source.name}.`,
          "Multiple outlets are following this story.",
          "Background and verified comments are below.",
        ];

  const whyItMatters = `This story is being followed because it touches on themes readers in this section frequently subscribe to. We'll send a follow-up if a major update lands within 24 hours.`;

  const words = source.split(/\s+/).length;
  const readingTimeSeconds = Math.max(20, Math.round(words / 3.5));

  return { tldr, bullets, whyItMatters, readingTimeSeconds };
}
