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

// ---------------------------------------------------------------------------
// Suggested follow-up questions
// ---------------------------------------------------------------------------

const followupSchema = z.object({
  article: inputSchema.shape.article,
  lastUserQuestion: z.string().max(2000).optional().nullable(),
  lastAiAnswer: z.string().max(8000).optional().nullable(),
});

export interface FollowupsResult {
  questions: string[];
  error: string | null;
}

const FOLLOWUP_SYSTEM = `You generate 3 short follow-up questions a curious
reader might ask next about a news article they're reading. Use the article
context, and (if provided) the reader's last question and the AI's last answer
to keep questions on-topic and non-repetitive.

Rules:
- Output ONLY a JSON array of 3 strings. No prose, no markdown, no code fences.
- Each question must be under 80 characters.
- Vary the angle: one factual, one critical / source-checking, one "what next".
- Do not repeat the reader's last question.
- No emoji.`;

/**
 * Robustly extract a JSON array of strings from a model response that may
 * include code fences or stray prose.
 */
function parseQuestions(text: string): string[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((q): q is string => typeof q === "string")
        .map((q) => q.trim())
        .filter((q) => q.length > 0 && q.length <= 120)
        .slice(0, 3);
    }
  } catch {
    // Try to find a JSON array substring
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((q): q is string => typeof q === "string")
            .map((q) => q.trim())
            .filter((q) => q.length > 0 && q.length <= 120)
            .slice(0, 3);
        }
      } catch {
        /* fall through */
      }
    }
  }
  return [];
}

export const suggestFollowupQuestions = createServerFn({ method: "POST" })
  .inputValidator((input) => followupSchema.parse(input))
  .handler(async ({ data }): Promise<FollowupsResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { questions: [], error: "AI is not configured." };
    }

    const userPayload = [
      `ARTICLE CONTEXT:\n${articleContext(data.article)}`,
      data.lastUserQuestion
        ? `\nREADER'S LAST QUESTION: ${data.lastUserQuestion}`
        : "",
      data.lastAiAnswer ? `\nAI'S LAST ANSWER: ${data.lastAiAnswer}` : "",
      `\nReturn 3 follow-up questions as a JSON array of strings.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: FOLLOWUP_SYSTEM },
              { role: "user", content: userPayload },
            ],
          }),
        },
      );

      if (res.status === 429) {
        return { questions: [], error: "Rate limited." };
      }
      if (res.status === 402) {
        return { questions: [], error: "AI credits exhausted." };
      }
      if (!res.ok) {
        return { questions: [], error: `AI request failed (${res.status}).` };
      }

      const json = await res.json();
      const text = String(json.choices?.[0]?.message?.content ?? "");
      const questions = parseQuestions(text);
      if (questions.length === 0) {
        return { questions: [], error: "AI returned no usable suggestions." };
      }
      return { questions, error: null };
    } catch (err) {
      console.error("suggestFollowupQuestions failed", err);
      return { questions: [], error: "AI request failed unexpectedly." };
    }
  });
