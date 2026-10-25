import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

const SYSTEM_PROMPT = `You are a financial-newswire editor.
Given an article, produce a concise brief.
Rules:
- Be factual, no speculation. If the article is too thin, leave bullets empty.
- TLDR is one sentence, max 220 chars.
- 3 bullets, each <= 140 chars, each adding new info.
- "Why it matters" is one sentence (<= 200 chars) explaining the broader stake.
- No markdown, no emoji, no quotes around the strings.`;

export const summarizeArticle = createServerFn({ method: "POST" })
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<SummarizeResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
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
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_summary",
                description: "Return a structured summary of the article.",
                parameters: {
                  type: "object",
                  properties: {
                    tldr: { type: "string", description: "One-sentence TL;DR" },
                    bullets: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 0,
                      maxItems: 5,
                    },
                    whyItMatters: { type: "string" },
                  },
                  required: ["tldr", "bullets", "whyItMatters"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "emit_summary" } },
        }),
      });

      if (res.status === 429) {
        return { summary: null, error: "Rate limited — please try again in a moment." };
      }
      if (res.status === 402) {
        return { summary: null, error: "AI credits exhausted for this workspace." };
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("AI gateway error", res.status, text);
        return { summary: null, error: `AI request failed (${res.status}).` };
      }

      const json = await res.json();
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      const argsRaw = toolCall?.function?.arguments;
      if (!argsRaw) {
        return { summary: null, error: "AI returned no structured summary." };
      }

      let parsed: { tldr?: string; bullets?: string[]; whyItMatters?: string };
      try {
        parsed = JSON.parse(argsRaw);
      } catch {
        return { summary: null, error: "Failed to parse AI response." };
      }

      const tldr = String(parsed.tldr ?? "").trim();
      const bullets = Array.isArray(parsed.bullets)
        ? parsed.bullets.map((b) => String(b).trim()).filter(Boolean).slice(0, 5)
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
      console.error("summarizeArticle failed", err);
      return { summary: null, error: "AI request failed unexpectedly." };
    }
    // wordCount is intentionally unused; kept for potential future telemetry
    void 0;
  });
