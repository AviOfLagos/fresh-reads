import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(20)
    .default([]),
  article: z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional().nullable(),
    content: z.string().max(20_000).optional().nullable(),
    sourceName: z.string().max(120).optional(),
    url: z.string().max(2048).optional(),
  }),
});

export interface AskAiResult {
  answer: string | null;
  error: string | null;
}

const SYSTEM_PROMPT = `You are a careful news-literacy assistant.
The user is reading a specific news article and asks questions about it.
Rules:
- Ground every claim in the article text the user gave you. If the article
  doesn't say something, say so plainly ("the article doesn't mention X").
- Never fabricate quotes, numbers, names, or dates. If unsure, say "I'm not sure".
- Be concise (1-3 short paragraphs unless asked for detail).
- If the user asks whether the news is real, evaluate signals from the
  article itself (named sources, dates, attributions, internal consistency)
  and recommend cross-checking with other outlets. Do not declare verdicts.
- No markdown headings, no emoji.`;

function articleContext(a: z.infer<typeof inputSchema>["article"]): string {
  const truncated = a.content
    ? a.content.slice(0, 8000).replace(/\[\d+ chars\]$/, "")
    : "";
  return [
    a.sourceName ? `SOURCE: ${a.sourceName}` : null,
    a.url ? `URL: ${a.url}` : null,
    `TITLE: ${a.title}`,
    a.description ? `DESCRIPTION: ${a.description}` : null,
    truncated ? `CONTENT:\n${truncated}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const askArticleQuestion = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<AskAiResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { answer: null, error: "AI is not configured." };
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: `ARTICLE CONTEXT (the only source of truth):\n\n${articleContext(data.article)}`,
      },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.question },
    ];

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (res.status === 429) {
        return { answer: null, error: "Rate limited — try again shortly." };
      }
      if (res.status === 402) {
        return { answer: null, error: "AI credits exhausted for this workspace." };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("AI gateway error", res.status, text);
        return { answer: null, error: `AI request failed (${res.status}).` };
      }

      const json = await res.json();
      const answer = String(json.choices?.[0]?.message?.content ?? "").trim();
      if (!answer) {
        return { answer: null, error: "AI returned an empty response." };
      }
      return { answer, error: null };
    } catch (err) {
      console.error("askArticleQuestion failed", err);
      return { answer: null, error: "AI request failed unexpectedly." };
    }
  });
