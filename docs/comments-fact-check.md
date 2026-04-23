# Comments & Community Fact-Check

> Status: **Live.** Comments and votes are persisted in Lovable Cloud
> (Postgres) with row-level security. Auth uses Supabase email + password.
> See `src/lib/use-comments.ts`, `src/components/comments-panel.tsx`, and
> the `comments` / `comment_votes` / `user_roles` tables.

## What it does

- Per-article comment thread with a composer (sign-in required).
- Two-button verdict per comment: **Real** / **Fake** (one vote per user;
  re-clicking removes the vote, switching flips it).
- A header verdict bar that aggregates votes across all comments into one of
  *Likely real*, *Disputed*, *Likely fake*, or *No votes yet*.
- "Verified" badges render only when a comment author currently holds the
  `verified` role in `user_roles`. The role is **granted, not claimed** —
  see "Verified authors" below.

## Production plan

### Schema (Lovable Cloud / Postgres)

```sql
create table comment (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  author_display text not null check (char_length(author_display) between 1 and 60),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz default now(),
  hidden boolean not null default false,
  hidden_reason text
);

create index comment_article on comment(article_id, created_at desc);

create table comment_vote (
  comment_id uuid references comment(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  verdict text not null check (verdict in ('real','fake')),
  created_at timestamptz default now(),
  primary key (comment_id, user_id)
);

-- Roles for the verified badge — see "Verified authors" below.
create type public.app_role as enum ('user','verified','moderator','admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles
                    where user_id = _user_id and role = _role) $$;
```

### RLS

```sql
alter table comment enable row level security;
alter table comment_vote enable row level security;
alter table user_roles enable row level security;

-- Anyone can read non-hidden comments
create policy "read comments" on comment
  for select using (hidden = false);

-- Authenticated users post their own comments
create policy "insert own comment" on comment
  for insert with check (auth.uid() = user_id);

-- Only moderators can hide
create policy "moderator hide" on comment
  for update using (public.has_role(auth.uid(), 'moderator'));

-- Votes — one per user per comment
create policy "vote rw" on comment_vote
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Verified-author badge

The badge in the prototype is self-claimed. In production it must be
**granted, never claimed**. Three pathways to earn the `verified` role:

1. **Email-domain proof** — sign in with an email at a known publisher
   domain (`@reuters.com`, `@guardian.co.uk`, etc.). Domain list managed by
   moderators.
2. **Manual review** — user submits a press card or LinkedIn URL; a
   moderator approves and inserts a `('verified')` row in `user_roles`.
3. **OAuth handle proof** — link a verified social account
   (e.g. ORCID for academics, X verified for journalists).

Display rule on the client: a comment shows the badge **only if** the
author currently has the `verified` role at render time. We never trust a
client-supplied flag.

### Fact-check verdict aggregation

```ts
// pseudo
function articleVerdict(votes: Vote[]) {
  const real = votes.filter(v => v.verdict === 'real').length;
  const fake = votes.filter(v => v.verdict === 'fake').length;
  if (real + fake === 0) return 'No votes yet';
  // Weight verified votes 3× — well-known anti-brigading multiplier.
  // Floor at 5 unique voters before showing a verdict to avoid noise.
}
```

Anti-abuse:

- Rate limit voting to 30 votes / user / hour at the API layer.
- IP+device fingerprint vote on guests; require sign-in for any verdict to
  count toward the headline label.
- Surface a "Why this verdict?" link that lists vote counts and the
  highest-rated dissenting comment, so a brigade can't quietly flip a story.

### Notifications integration

When a verified author replies to your comment, or when an article you
commented on flips from *Likely real* → *Disputed*, fire a notification via
the system in [`notifications.md`](./notifications.md).

### Moderation tooling (out of scope for v1)

- `hidden` flag with reason audit trail (already in schema).
- Report button → ticket in a `report` table reviewed by `moderator` role.
- Shadow ban: hide a user's posts only from other users (still visible to
  themselves) — useful against trolls.
