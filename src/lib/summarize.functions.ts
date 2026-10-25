import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { z as z4 } from "zod/v4";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { claude, MODEL, FALLBACK, aiError } from "./claude.server";

const inputSchema = z.object({
  articleId: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  content: z.string().max(20_000).optional().nullable(),
  sourceName: z.string().max(120).optional(),
});

export interface SummaryPayload {
  tldr: string;
  bullets: string[];
  whyItMatters: string;
  readingTimeSeconds: number;
}

export interface SummarizeResult {
  summary: SummaryPayload | null;
  error: string | null;
}

const SYSTEM_PROMPT = `You are a news editor writing for software developers.
Given an article, produce a concise brief.
Rules:
- Be factual, no speculation. If the article is too thin, leave bullets empty.
- TLDR is one sentence, max 220 chars.
- 3 bullets, each <= 140 chars, each adding new info.
- "Why it matters" is one sentence (<= 200 chars) explaining the broader stake.
- No markdown, no emoji, no quotes around the strings.`;

const SummarySchema = z4.object({
  tldr: z4.string().describe("One-sentence TL;DR"),
  bullets: z4.array(z4.string()).describe("Up to 5 bullets, each adding new info"),
  whyItMatters: z4.string(),
});

export const summarizeArticle = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<SummarizeResult> => {
    const ai = claude();
    if (!ai) {
      return { summary: null, error: "AI is not configured." };
    }

    const truncatedContent = data.content
      ? data.content.slice(0, 8000).replace(/\[\d+ chars\]$/, "")
      : "";

    const userPrompt = [
      data.sourceName ? `SOURCE: ${data.sourceName}` : null,
      `TITLE: ${data.title}`,
      data.description ? `DESCRIPTION: ${data.description}` : null,
      truncatedContent ? `CONTENT:\n${truncatedContent}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const res = await ai.beta.messages.parse({
        ...FALLBACK,
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
        output_config: { effort: "low", format: betaZodOutputFormat(SummarySchema) },
      });
      if (res.stop_reason === "refusal") {
        return { summary: null, error: "AI declined to summarize this article." };
      }
      const parsed = res.parsed_output;
      if (!parsed) {
        return { summary: null, error: "AI returned no structured summary." };
      }

      const tldr = String(parsed.tldr ?? "").trim();
      const bullets = Array.isArray(parsed.bullets)
        ? parsed.bullets
            .map((b) => String(b).trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];
      const whyItMatters = String(parsed.whyItMatters ?? "").trim();

      const wordCount = [tldr, ...bullets, whyItMatters].join(" ").split(/\s+/).length;
      const sourceWords = userPrompt.split(/\s+/).length;
      const readingTimeSeconds = Math.max(20, Math.round(sourceWords / 3.5));

      if (!tldr) {
        return { summary: null, error: "AI returned an empty summary." };
      }

      return {
        summary: {
          tldr,
          bullets,
          whyItMatters,
          readingTimeSeconds: Math.min(readingTimeSeconds, 600),
        },
        error: null,
      };
    } catch (err) {
      return { summary: null, error: aiError(err, "summarizeArticle failed") };
    }
    // wordCount is intentionally unused; kept for potential future telemetry
    void 0;
  });
