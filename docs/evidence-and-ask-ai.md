# Evidence & Ask-AI

> Status: **Live.** Both features ship as part of every article page (see
> `src/components/evidence-panel.tsx` and `src/components/ask-ai-panel.tsx`).

## Supporting evidence

Signed-in users can submit three kinds of evidence on any article:

| Kind | What it is | Stored as |
| --- | --- | --- |
| **Text** | A note, quote, translation, or first-hand account. | `body` |
| **Image** | An image URL (screenshot, photo, infographic). | `image_url` (+ optional caption in `body`) |
| **Source link** | A URL to a corroborating or refuting source. | `source_url` (+ optional rationale in `body`) |

### Why URLs and not file uploads

The product brief asked for "text or media files." We chose to accept image
**URLs** (and source URLs) instead of raw file uploads to keep the v1 simple,
free, and abuse-resistant. Trade-offs:

- ✅ Zero storage cost
- ✅ No virus-scanning, MIME-sniffing, or content-moderation pipeline needed
- ✅ Image hot-linking from imgur, news CDNs, etc. is the dominant pattern
  for fact-check threads on Twitter/X today
- ⚠️ Hot-linked images can disappear over time (link-rot) — acceptable for
  a community-facing fact-check surface

### Schema (`article_evidence`)

```sql
create table public.article_evidence (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  user_id uuid not null,
  author_display text not null check (char_length(author_display) between 1 and 60),
  kind text not null check (kind in ('text','image_url','source_url')),
  body text check (body is null or char_length(body) between 1 and 2000),
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  source_url text check (source_url is null or char_length(source_url) <= 2048),
  hidden boolean not null default false,
  created_at timestamptz default now()
);
```

RLS:

- Anyone can `SELECT` non-hidden rows.
- Authenticated users `INSERT` and `DELETE` only their own rows.
- Moderators (`has_role(auth.uid(), 'moderator')`) can `UPDATE` to hide.

### Production v2 — real file uploads

Add a public `evidence-images` storage bucket, restrict to image MIME types
under 5 MB, and run uploads through a SafeSearch / NSFW classifier on
ingestion. The UI shell already works — only the "Image" tab needs to call
`supabase.storage.upload(...)` instead of accepting a URL.

---

## Ask AI

A chat panel under every article. Users ask questions about the article and
the AI answers using only the article text as context.

### How it works

- Calls `askArticleQuestion` server function (`src/server/ask-ai.ts`).
- Provider: Lovable AI Gateway, model `google/gemini-2.5-flash`.
- The system prompt forbids fabrication: "If the article doesn't say
  something, say so plainly." We also pass the article title, description,
  source, URL, and content as a separate `system` message labeled
  `ARTICLE CONTEXT (the only source of truth)`.
- Conversation is bounded: last 20 turns sent back to the model.

### Persistence

Each session has a fresh UUID `session_id`. Every user/assistant message is
inserted into `ai_chat_messages` with `(user_id, article_id, session_id)`.
RLS only lets the user read/write their own rows.

### "Save as comment" → comment thread

Clicking **Save as comment** in the chat header serializes the entire
conversation (`Q: …\n\nAI: …\n\n…`) into a single comment with a `🤖` prefix
and inserts it into the existing `comments` table. From there it joins the
normal community fact-check flow: other users can vote it Real / Fake.

### Anti-abuse

- 1000-char composer limit per message; 8000 per turn server-side.
- Rate limits inherited from Lovable AI Gateway (429 → toast).
- The system prompt explicitly refuses to declare "real / fake" verdicts —
  it lists signals (named sources, dates, attributions) and recommends
  cross-checking. Verdicts come only from the community vote.

### Production v2

- Stream tokens via SSE for snappier UX (the gateway supports `stream: true`).
- Per-user daily quota stored in a `ai_chat_quota` table to prevent runaway
  spend on free accounts.
- "Cite the part of the article" — ask the model to return character offsets
  of the sentences that support each claim, then highlight them inline.
