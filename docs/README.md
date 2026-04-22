# Newsroom — Feature Docs

This directory describes how each prototyped feature would work in
production. The current app ships **mock data + UI prototypes** for the
following:

| Feature                 | Doc                                               | Prototype state |
| ----------------------- | ------------------------------------------------- | --------------- |
| Multi-source feed       | [multi-source.md](./multi-source.md)              | Source chips, mock attribution |
| Topic notifications     | [notifications.md](./notifications.md)            | Bell + inbox + follow chips    |
| AI article summary      | [ai-summary.md](./ai-summary.md)                  | Heuristic TL;DR panel          |
| Comments + fact-check   | [comments-fact-check.md](./comments-fact-check.md)| Voting + verdict bar           |

The only **live** integration in the app is the GNews feed
(`src/server/news.ts`).

## Responsiveness

The UI is designed to remain usable down to **240×240 px** (Apple Watch
Ultra and large Android wearables). Strategies used:

- A custom `xs: 22rem` breakpoint in `src/styles.css` controls when icon-only
  buttons gain text labels.
- All headline grids collapse to a single column below `xs`.
- Header chrome (logo wordmark, live clock, "Live" pill) progressively
  hides — only the logo mark, nav icons and bell remain at watch sizes.

## Where to start reading the code

- `src/lib/sources.ts`, `src/lib/subscriptions.ts`, `src/lib/comments.ts`,
  `src/lib/summary.ts` — mock data layer.
- `src/components/source-filter.tsx`, `notifications-button.tsx`,
  `article-summary.tsx`, `comments-panel.tsx` — the four prototype UIs.
- `src/routes/index.tsx` — wires source filter into the feed.
- `src/routes/article.$id.tsx` — wires summary + comments into article view.
