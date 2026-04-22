# Notifications & Topic Follow-Ups

> Status: **UI prototype with mock notifications stored in `localStorage`.**

## What the prototype does

- `src/lib/subscriptions.ts` — store of followed topics + a fake notification
  inbox. Subscribing seeds one mock follow-up so the UX is visible.
- `src/components/notifications-button.tsx` — bell button in the site header
  with an unread count badge, a follow/unfollow chip row, and an inbox panel
  that auto-marks-read after open.

## What "channeling notifications for follow-up events" means

Three flavors, in order of build difficulty:

1. **In-app inbox** — push real-time follow-ups while the user is on the site.
2. **Web push** — operating-system-level notifications even when the tab is
   closed (desktop + Android). Requires user permission and a service worker.
3. **Email digest** — daily/weekly summary of new stories per followed topic.

## Production plan

### Data model (Lovable Cloud / Postgres)

```sql
-- one row per (user, topic)
create table topic_subscription (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null check (char_length(topic) between 1 and 60),
  channels text[] not null default array['inapp'], -- 'inapp' | 'push' | 'email'
  created_at timestamptz default now(),
  unique (user_id, lower(topic))
);

create table notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  article_id text not null,
  title text not null,
  summary text not null,
  url text not null,
  delivered_channels text[] not null default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);

create index notification_user_unread on notification (user_id) where read_at is null;
```

RLS: users can only read/update their own rows. A SECURITY DEFINER function
`enqueue_topic_notification(topic, article)` lets a server function fan-out
to all matching subscribers without exposing the table.

### Matching engine

A scheduled server route runs every 2–5 minutes:

1. Fetch the latest articles from all enabled sources.
2. For each article, derive a `topics: string[]` (NER on title +
   description, plus simple keyword match on the user's followed topics).
3. For every `(user_id, topic)` row that matches, insert a `notification`
   row — but only if no notification with the same canonical URL already
   exists for that user in the last 24h (de-dup).
4. For each new notification, fan-out to its delivery channels.

### Delivery channels

| Channel  | Mechanism                                                                 |
| -------- | ------------------------------------------------------------------------- |
| `inapp`  | Insert into `notification` table; client subscribes via Realtime / poll.  |
| `push`   | Web Push: register a service worker, store the user's `PushSubscription` JSON, send via `web-push` (signed with VAPID keys, kept as Lovable Cloud secrets). |
| `email`  | Lovable Email — auth-friendly transactional template, daily digest cron.  |

The bell badge in the header subscribes to a Realtime channel
`notifications:user_<id>` and increments locally on every insert.

### Permissions UX

Web push must be requested *after* the user's first explicit "follow this
topic" action — never on first page load. If denied, fall back silently to
in-app only and surface a one-line tip in the inbox panel.

### Why "follow-up events"?

When two articles share a near-duplicate title within a 24h window
(see `multi-source.md` § 3), the second one is sent as a `follow-up: true`
notification. The inbox renders these with a "↻ Update" prefix so the user
knows it's new info on a story they already read.
