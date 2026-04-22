// Mock comments + community fact-check votes per article.
// Real implementation plan: docs/comments-fact-check.md

import { useEffect, useState, useCallback } from "react";

export type Verdict = "real" | "fake";

export interface Comment {
  id: string;
  articleId: string;
  author: string;
  /** Whether the author has gone through ID verification. */
  verifiedAuthor: boolean;
  /** Optional credentials e.g. "Journalist · Reuters", "PhD, Climate Sci." */
  credentials?: string;
  body: string;
  createdAt: string;
  votes: Record<Verdict, number>;
  /** What the current device voted, if anything. */
  myVote?: Verdict;
}

const KEY = "newsroom.comments.v1";

function readAll(): Record<string, Comment[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, Comment[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("comments:changed"));
}

function seed(articleId: string): Comment[] {
  const now = Date.now();
  return [
    {
      id: `c_${articleId}_1`,
      articleId,
      author: "Maya R.",
      verifiedAuthor: true,
      credentials: "Reporter · The Standard",
      body: "Cross-checked with two on-the-ground sources — the core claim holds. The casualty figure is still developing.",
      createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
      votes: { real: 24, fake: 2 },
    },
    {
      id: `c_${articleId}_2`,
      articleId,
      author: "alex_99",
      verifiedAuthor: false,
      body: "The image in this story is from a 2019 event. Reverse image search returns earlier results.",
      createdAt: new Date(now - 1000 * 60 * 42).toISOString(),
      votes: { real: 3, fake: 11 },
    },
    {
      id: `c_${articleId}_3`,
      articleId,
      author: "Dr. K. Patel",
      verifiedAuthor: true,
      credentials: "PhD · Public Health",
      body: "The methodology referenced exists, but the article overstates the certainty. Treat the headline cautiously.",
      createdAt: new Date(now - 1000 * 60 * 95).toISOString(),
      votes: { real: 14, fake: 6 },
    },
  ];
}

export function useComments(articleId: string) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!articleId) return;
    const all = readAll();
    if (!all[articleId]) {
      all[articleId] = seed(articleId);
      writeAll(all);
    }
    setComments(all[articleId] ?? []);
    const onChange = () => {
      const next = readAll();
      setComments(next[articleId] ?? []);
    };
    window.addEventListener("comments:changed", onChange);
    return () => window.removeEventListener("comments:changed", onChange);
  }, [articleId]);

  const add = useCallback(
    (input: { author: string; body: string; verifiedAuthor: boolean; credentials?: string }) => {
      if (!input.body.trim()) return;
      const all = readAll();
      const list = all[articleId] ?? [];
      const c: Comment = {
        id: `c_${articleId}_${Date.now()}`,
        articleId,
        author: input.author.trim() || "Anonymous",
        verifiedAuthor: input.verifiedAuthor,
        credentials: input.credentials?.trim() || undefined,
        body: input.body.trim().slice(0, 1000),
        createdAt: new Date().toISOString(),
        votes: { real: 0, fake: 0 },
      };
      all[articleId] = [c, ...list];
      writeAll(all);
    },
    [articleId],
  );

  const vote = useCallback(
    (commentId: string, verdict: Verdict) => {
      const all = readAll();
      const list = all[articleId] ?? [];
      all[articleId] = list.map((c) => {
        if (c.id !== commentId) return c;
        const next = { ...c, votes: { ...c.votes } };
        // Undo previous vote
        if (next.myVote && next.votes[next.myVote] > 0) {
          next.votes[next.myVote] -= 1;
        }
        if (next.myVote === verdict) {
          // toggle off
          next.myVote = undefined;
        } else {
          next.votes[verdict] += 1;
          next.myVote = verdict;
        }
        return next;
      });
      writeAll(all);
    },
    [articleId],
  );

  return { comments, add, vote };
}

export function articleVerdict(comments: Comment[]): {
  realPct: number;
  fakePct: number;
  totalVotes: number;
  label: "Likely real" | "Disputed" | "Likely fake" | "No votes yet";
} {
  const real = comments.reduce((s, c) => s + c.votes.real, 0);
  const fake = comments.reduce((s, c) => s + c.votes.fake, 0);
  const total = real + fake;
  if (total === 0) return { realPct: 0, fakePct: 0, totalVotes: 0, label: "No votes yet" };
  const realPct = Math.round((real / total) * 100);
  const fakePct = 100 - realPct;
  let label: "Likely real" | "Disputed" | "Likely fake";
  if (realPct >= 65) label = "Likely real";
  else if (realPct <= 35) label = "Likely fake";
  else label = "Disputed";
  return { realPct, fakePct, totalVotes: total, label };
}
