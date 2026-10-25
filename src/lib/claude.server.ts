// Claude for the server functions (Ask AI, summaries). Server-only: the key
// is read from ANTHROPIC_API_KEY where the site runs (Vercel env), never
// shipped to the browser.
import Anthropic from "@anthropic-ai/sdk";

/** Override with ANTHROPIC_MODEL, e.g. claude-haiku-5-5 for lower cost. */
export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// A safety decline on the main model is retried on a fallback the API picks.
export const FALLBACK: { betas: string[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let client: Anthropic | null = null;

/** null when ANTHROPIC_API_KEY is not set, so callers can say "not configured". */
export function claude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

/** A short, user-facing message for a failed call; details go to the log. */
export function aiError(err: unknown, where: string): string {
  if (err instanceof Anthropic.RateLimitError) return "Rate limited — try again in a moment.";
  if (err instanceof Anthropic.AuthenticationError) return "AI is not configured.";
  if (err instanceof Anthropic.APIError) {
    console.error(where, err.status, err.message);
    return err.status === 529
      ? "AI is overloaded — try again shortly."
      : `AI request failed (${err.status}).`;
  }
  console.error(where, err);
  return "AI request failed unexpectedly.";
}
