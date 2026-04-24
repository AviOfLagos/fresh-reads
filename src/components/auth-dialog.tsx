import { useState } from "react";
import { X, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const credSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72, { message: "Password too long" }),
  displayName: z
    .string()
    .trim()
    .min(1, { message: "Display name required" })
    .max(40, { message: "Max 40 characters" })
    .optional(),
});

export function AuthDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credSchema.safeParse({
      email,
      password,
      displayName: mode === "signup" ? displayName : undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: parsed.data.displayName },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Signed in.");
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-3 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "signup" ? "Create an account" : "Sign in"}
    >
      <div
        className="relative my-auto w-full max-w-sm max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-border bg-surface p-4 sm:p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="headline text-lg font-semibold mb-1">
          {mode === "signup" ? "Create an account" : "Sign in"}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {mode === "signup"
            ? "Required to comment and vote on stories."
            : "Welcome back to the newsroom."}
        </p>

        <form onSubmit={submit} className="space-y-2.5">
          {mode === "signup" && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              maxLength={40}
              className="w-full border border-border bg-background px-2 py-2 text-sm focus:border-primary focus:outline-none"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full border border-border bg-background px-2 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full border border-border bg-background px-2 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 bg-primary px-3 py-2 ticker-text text-[11px] uppercase tracking-widest text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {mode === "signup" ? <UserPlus className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
            {submitting ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </div>
    </div>
  );
}
