import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type EvidenceKind = "text" | "image_url" | "source_url";

export interface EvidenceRow {
  id: string;
  article_id: string;
  user_id: string;
  author_display: string;
  kind: EvidenceKind;
  body: string | null;
  image_url: string | null;
  source_url: string | null;
  hidden: boolean;
  created_at: string;
  // Vote aggregates (client-side enriched)
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | 0;
}

interface VoteRow {
  evidence_id: string;
  user_id: string;
  vote: number;
}

export function useEvidence(articleId: string, currentUserId: string | null) {
  const [items, setItems] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!articleId) return;
    setError(null);
    const { data, error: e } = await supabase
      .from("article_evidence")
      .select(
        "id, article_id, user_id, author_display, kind, body, image_url, source_url, hidden, created_at",
      )
      .eq("article_id", articleId)
      .eq("hidden", false)
      .order("created_at", { ascending: false });
    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Omit<EvidenceRow, "upvotes" | "downvotes" | "myVote">[];
    const ids = rows.map((r) => r.id);

    // Fetch all votes for these evidence rows
    let votes: VoteRow[] = [];
    if (ids.length > 0) {
      const { data: vd } = await supabase
        .from("evidence_votes")
        .select("evidence_id, user_id, vote")
        .in("evidence_id", ids);
      votes = (vd ?? []) as VoteRow[];
    }

    const enriched: EvidenceRow[] = rows.map((r) => {
      let up = 0;
      let down = 0;
      let mine: 1 | -1 | 0 = 0;
      for (const v of votes) {
        if (v.evidence_id !== r.id) continue;
        if (v.vote === 1) up++;
        else if (v.vote === -1) down++;
        if (currentUserId && v.user_id === currentUserId) {
          mine = v.vote === 1 ? 1 : -1;
        }
      }
      return { ...r, upvotes: up, downvotes: down, myVote: mine };
    });

    setItems(enriched);
    setLoading(false);
  }, [articleId, currentUserId]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const submit = useCallback(
    async (input: {
      authorDisplay: string;
      kind: EvidenceKind;
      body?: string;
      imageUrl?: string;
      sourceUrl?: string;
    }) => {
      if (!currentUserId) return { error: "Sign in to add evidence." };
      const author = input.authorDisplay.trim().slice(0, 60) || "Anonymous";

      // Validate per kind
      if (input.kind === "text") {
        const body = (input.body ?? "").trim().slice(0, 2000);
        if (!body) return { error: "Add some text first." };
        const { error: ie } = await supabase.from("article_evidence").insert({
          article_id: articleId,
          user_id: currentUserId,
          author_display: author,
          kind: "text",
          body,
        });
        if (ie) return { error: ie.message };
      } else if (input.kind === "image_url") {
        const url = (input.imageUrl ?? "").trim().slice(0, 2048);
        if (!/^https?:\/\//i.test(url)) {
          return { error: "Image URL must start with http(s)://" };
        }
        const body = (input.body ?? "").trim().slice(0, 2000) || null;
        const { error: ie } = await supabase.from("article_evidence").insert({
          article_id: articleId,
          user_id: currentUserId,
          author_display: author,
          kind: "image_url",
          image_url: url,
          body,
        });
        if (ie) return { error: ie.message };
      } else {
        const url = (input.sourceUrl ?? "").trim().slice(0, 2048);
        if (!/^https?:\/\//i.test(url)) {
          return { error: "Source URL must start with http(s)://" };
        }
        const body = (input.body ?? "").trim().slice(0, 2000) || null;
        const { error: ie } = await supabase.from("article_evidence").insert({
          article_id: articleId,
          user_id: currentUserId,
          author_display: author,
          kind: "source_url",
          source_url: url,
          body,
        });
        if (ie) return { error: ie.message };
      }

      await refresh();
      return { error: null };
    },
    [articleId, currentUserId, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: de } = await supabase
        .from("article_evidence")
        .delete()
        .eq("id", id);
      if (de) return { error: de.message };
      await refresh();
      return { error: null };
    },
    [refresh],
  );

  /** Cast / change / remove a vote. Pass 1 (up), -1 (down). Same value clears. */
  const vote = useCallback(
    async (evidenceId: string, value: 1 | -1) => {
      if (!currentUserId) return { error: "Sign in to vote." };

      // Optimistic update
      let next = items.map((it) => {
        if (it.id !== evidenceId) return it;
        const prev = it.myVote;
        let upvotes = it.upvotes;
        let downvotes = it.downvotes;
        let myVote: 1 | -1 | 0 = prev;

        if (prev === value) {
          // toggle off
          if (value === 1) upvotes -= 1;
          else downvotes -= 1;
          myVote = 0;
        } else if (prev === 0) {
          if (value === 1) upvotes += 1;
          else downvotes += 1;
          myVote = value;
        } else {
          // switch
          if (value === 1) {
            upvotes += 1;
            downvotes -= 1;
          } else {
            downvotes += 1;
            upvotes -= 1;
          }
          myVote = value;
        }
        return { ...it, upvotes, downvotes, myVote };
      });
      setItems(next);

      const target = items.find((i) => i.id === evidenceId);
      const prevVote = target?.myVote ?? 0;

      try {
        if (prevVote === value) {
          // Toggle off → delete
          const { error: de } = await supabase
            .from("evidence_votes")
            .delete()
            .eq("evidence_id", evidenceId)
            .eq("user_id", currentUserId);
          if (de) throw de;
        } else {
          // Upsert
          const { error: ue } = await supabase
            .from("evidence_votes")
            .upsert(
              {
                evidence_id: evidenceId,
                user_id: currentUserId,
                vote: value,
              },
              { onConflict: "evidence_id,user_id" },
            );
          if (ue) throw ue;
        }
        return { error: null };
      } catch (err) {
        // Revert on failure
        await refresh();
        const msg = err instanceof Error ? err.message : "Vote failed.";
        return { error: msg };
      }
    },
    [items, currentUserId, refresh],
  );

  return { items, loading, error, submit, remove, vote, refresh };
}
