import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Verdict = "real" | "fake";

export interface CommentRow {
  id: string;
  article_id: string;
  user_id: string | null;
  author_display: string;
  body: string;
  hidden: boolean;
  created_at: string;
}

export interface VoteRow {
  comment_id: string;
  user_id: string;
  verdict: Verdict;
}

export interface RoleRow {
  user_id: string;
  role: "user" | "verified" | "moderator" | "admin";
}

export interface CommentView {
  id: string;
  articleId: string;
  userId: string | null;
  author: string;
  body: string;
  createdAt: string;
  verifiedAuthor: boolean;
  votes: { real: number; fake: number };
  myVote?: Verdict;
}

export function useComments(articleId: string, currentUserId: string | null) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [verifiedUserIds, setVerifiedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!articleId) return;
    setError(null);
    const [{ data: cs, error: ce }, { data: vs, error: ve }] = await Promise.all([
      supabase
        .from("comments")
        .select("id, article_id, user_id, author_display, body, hidden, created_at")
        .eq("article_id", articleId)
        .eq("hidden", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("comment_votes")
        .select("comment_id, user_id, verdict")
        .in(
          "comment_id",
          // Will be re-filtered after we know IDs; cheap upper bound for small lists
          [],
        ),
    ]);
    if (ce) {
      setError(ce.message);
      setLoading(false);
      return;
    }
    const list = (cs ?? []) as CommentRow[];
    setComments(list);

    if (list.length > 0) {
      const ids = list.map((c) => c.id);
      const { data: vs2 } = await supabase
        .from("comment_votes")
        .select("comment_id, user_id, verdict")
        .in("comment_id", ids);
      setVotes((vs2 ?? []) as VoteRow[]);

      const userIds = Array.from(new Set(list.map((c) => c.user_id).filter(Boolean) as string[]));
      if (userIds.length > 0) {
        const { data: rs } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds)
          .eq("role", "verified");
        setVerifiedUserIds(new Set((rs ?? []).map((r) => (r as RoleRow).user_id)));
      } else {
        setVerifiedUserIds(new Set());
      }
    } else {
      setVotes([]);
      setVerifiedUserIds(new Set());
      void ve; // not used
    }
    setLoading(false);
  }, [articleId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const view: CommentView[] = useMemo(() => {
    return comments.map((c) => {
      const cVotes = votes.filter((v) => v.comment_id === c.id);
      const real = cVotes.filter((v) => v.verdict === "real").length;
      const fake = cVotes.filter((v) => v.verdict === "fake").length;
      const mine = currentUserId
        ? cVotes.find((v) => v.user_id === currentUserId)?.verdict
        : undefined;
      return {
        id: c.id,
        articleId: c.article_id,
        userId: c.user_id,
        author: c.author_display,
        body: c.body,
        createdAt: c.created_at,
        verifiedAuthor: c.user_id ? verifiedUserIds.has(c.user_id) : false,
        votes: { real, fake },
        myVote: mine,
      };
    });
  }, [comments, votes, verifiedUserIds, currentUserId]);

  const add = useCallback(
    async (input: { authorDisplay: string; body: string }) => {
      if (!currentUserId) return { error: "Sign in to comment." };
      const body = input.body.trim().slice(0, 1000);
      const author = input.authorDisplay.trim().slice(0, 60) || "Anonymous";
      if (!body) return { error: "Comment can't be empty." };
      const { error: ie } = await supabase.from("comments").insert({
        article_id: articleId,
        user_id: currentUserId,
        author_display: author,
        body,
      });
      if (ie) return { error: ie.message };
      await refresh();
      return { error: null };
    },
    [articleId, currentUserId, refresh],
  );

  const vote = useCallback(
    async (commentId: string, verdict: Verdict) => {
      if (!currentUserId) return { error: "Sign in to vote." };
      const existing = votes.find(
        (v) => v.comment_id === commentId && v.user_id === currentUserId,
      );
      if (existing && existing.verdict === verdict) {
        // toggle off
        const { error: de } = await supabase
          .from("comment_votes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUserId);
        if (de) return { error: de.message };
      } else {
        const { error: ue } = await supabase
          .from("comment_votes")
          .upsert(
            {
              comment_id: commentId,
              user_id: currentUserId,
              verdict,
            },
            { onConflict: "comment_id,user_id" },
          );
        if (ue) return { error: ue.message };
      }
      await refresh();
      return { error: null };
    },
    [votes, currentUserId, refresh],
  );

  return { comments: view, loading, error, add, vote, refresh };
}

export function articleVerdict(comments: CommentView[]) {
  const real = comments.reduce((s, c) => s + c.votes.real, 0);
  const fake = comments.reduce((s, c) => s + c.votes.fake, 0);
  const total = real + fake;
  if (total === 0) {
    return { realPct: 0, fakePct: 0, totalVotes: 0, label: "No votes yet" as const };
  }
  const realPct = Math.round((real / total) * 100);
  const fakePct = 100 - realPct;
  let label: "Likely real" | "Disputed" | "Likely fake";
  if (realPct >= 65) label = "Likely real";
  else if (realPct <= 35) label = "Likely fake";
  else label = "Disputed";
  return { realPct, fakePct, totalVotes: total, label };
}
