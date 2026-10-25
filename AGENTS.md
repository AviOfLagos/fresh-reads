# Project Rules

## Server functions location
- Server functions (`createServerFn` files) live in `src/lib/*.functions.ts` (e.g. `news.functions.ts`, `events.functions.ts`, `summarize.functions.ts`, `ask-ai.functions.ts`). Never put them in `src/server/` — the TanStack import-protection plugin blocks `src/server/**` from client bundles and any route/component import there fails the build.
- Keep `.functions.ts` files thin: server-fn declarations and client-safe imports (zod, types) only.

## Auth
- `src/start.ts` must keep the client-side `functionMiddleware` that attaches the Supabase bearer token (existing project middleware + `attachSupabaseAuth`); do not replace the middleware array.
