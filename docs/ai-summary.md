# AI Article Summary

> Status: **UI prototype.** The summary is generated client-side by a tiny
> heuristic (`src/lib/summary.ts`) that picks the first informative sentences.

## Prototype features

- "AI Brief" expandable panel on every article page.
- TL;DR + 3 bullets + "Why it matters" + estimated reading time.
- "Regenerate" button simulates a network round-trip with skeletons.

## Production plan: Lovable AI Gateway

The Gateway is the recommended path because it's already provisioned —
no extra account, no extra key — and it speaks the OpenAI chat-completions
shape so any model can be swapped in.

### 1. Server function

```ts
// src/server/summarize.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  articleId: z.string().min(1).max(120),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  content: z.string().max(20_000).optional(),
});

const SYSTEM = `You are a financial-newswire editor. Given an article,
produce strict JSON: { "tldr": string, "bullets": string[3..5],
"whyItMatters": string }. No prose outside JSON. No speculation. If
the article is too thin to summarize, set bullets: [] and whyItMatters: "".`;

export const summarizeArticle = createServerFn({ method: "POST" })
  .inputValidator((i) => inputSchema.parse(i))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { error: "AI not configured" };

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            `TITLE: ${data.title}`,
            data.description && `DESCRIPTION: ${data.description}`,
            data.content && `CONTENT:\n${data.content}`,
          ].filter(Boolean).join("\n\n"),
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429) return { error: "Rate limited. Try again shortly." };
    if (res.status === 402) return { error: "AI credits exhausted." };
    if (!res.ok) return { error: `AI request failed (${res.status})` };

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return { summary: parsed, error: null };
  });
```

### 2. Caching

Summaries don't change. Cache by `articleId` in:

- A Postgres table `article_summary(article_id pk, model, json, created_at)`.
- The client's existing `localStorage` cache, keyed under
  `newsroom.summaries.v1`.

Render-time precedence: client cache → server cache → AI call.

### 3. Streaming UX (optional)

Use SSE streaming from the Gateway so the TL;DR types out word-by-word.
The current panel already has a skeleton state that this would replace.

### 4. Safety

- Truncate `content` to 8 000 characters before sending. News articles vary
  wildly in length and we want predictable cost.
- Reject any summary where `tldr` references entities not present in the
  source text (simple substring check on capitalized nouns).
- Append a small "AI-generated · may contain errors" footer in the UI
  (already present in the prototype).

### 5. Models

Default: `google/gemini-2.5-flash` (free tier, very fast, 1M context).
Premium toggle (paid): `openai/gpt-5-mini` for higher precision summaries.
