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
    setItems((data ?? []) as EvidenceRow[]);
    setLoading(false);
  }, [articleId]);

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

  return { items, loading, error, submit, remove, refresh };
}
