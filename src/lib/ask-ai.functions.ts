import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { claude, MODEL, FALLBACK, aiError } from "./claude.server";

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
  const truncated = a.content ? a.content.slice(0, 8000).replace(/\[\d+ chars\]$/, "") : "";
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
    const ai = claude();
    if (!ai) {
      return { answer: null, error: "AI is not configured." };
    }

    try {
      const res = await ai.beta.messages.create({
        ...FALLBACK,
        model: MODEL,
        max_tokens: 4000,
        // the article is data to answer from, in the system prompt with the rules
        system: `${SYSTEM_PROMPT}\n\nARTICLE CONTEXT (the only source of truth):\n\n${articleContext(data.article)}`,
        messages: [
          ...data.history.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: data.question },
        ],
        output_config: { effort: "low" },
      });
      if (res.stop_reason === "refusal") {
        return { answer: null, error: "AI declined to answer this question." };
      }
      const answer = res.content
        .flatMap((b) => (b.type === "text" ? [b.text] : []))
        .join("")
        .trim();
      if (!answer) {
        return { answer: null, error: "AI returned an empty response." };
      }
      return { answer, error: null };
    } catch (err) {
      return { answer: null, error: aiError(err, "askArticleQuestion failed") };
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
- Each question must be under 80 characters.
- Vary the angle: one factual, one critical / source-checking, one "what next".
- Do not repeat the reader's last question.
- No emoji.`;

const FollowupSchema = z4.object({ questions: z4.array(z4.string()) });

export const suggestFollowupQuestions = createServerFn({ method: "POST" })
  .inputValidator((input) => followupSchema.parse(input))
  .handler(async ({ data }): Promise<FollowupsResult> => {
    const ai = claude();
    if (!ai) {
      return { questions: [], error: "AI is not configured." };
    }

    const userPayload = [
      `ARTICLE CONTEXT:\n${articleContext(data.article)}`,
      data.lastUserQuestion ? `\nREADER'S LAST QUESTION: ${data.lastUserQuestion}` : "",
      data.lastAiAnswer ? `\nAI'S LAST ANSWER: ${data.lastAiAnswer}` : "",
      `\nReturn 3 follow-up questions.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await ai.beta.messages.parse({
        ...FALLBACK,
        model: MODEL,
        max_tokens: 2000,
        system: FOLLOWUP_SYSTEM,
        messages: [{ role: "user", content: userPayload }],
        output_config: { effort: "low", format: betaZodOutputFormat(FollowupSchema) },
      });
      const questions = (res.parsed_output?.questions ?? [])
        .map((q) => q.trim())
        .filter((q) => q.length > 0 && q.length <= 120)
        .slice(0, 3);
      if (questions.length === 0) {
        return { questions: [], error: "AI returned no usable suggestions." };
      }
      return { questions, error: null };
    } catch (err) {
      return { questions: [], error: aiError(err, "suggestFollowupQuestions failed") };
    }
  });
