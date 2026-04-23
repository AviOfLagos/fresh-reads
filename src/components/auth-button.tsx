import { useState } from "react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { AuthDialog } from "@/components/auth-dialog";
import { supabase } from "@/integrations/supabase/client";

export function AuthButton() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="h-6 w-12 skeleton hidden sm:block" />;
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 border border-border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          aria-label="Sign in"
        >
          <LogIn className="h-3 w-3" />
          <span className="hidden sm:inline">Sign in</span>
        </button>
        <AuthDialog open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const name =
    (user.user_metadata as { display_name?: string } | undefined)?.display_name ??
    user.email?.split("@")[0] ??
    "Account";

  return (
    <div className="flex items-center gap-1">
      <span className="hidden sm:inline-flex items-center gap-1 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
        <UserIcon className="h-3 w-3" />
        {name}
      </span>
      <button
        onClick={() => supabase.auth.signOut()}
        className="inline-flex items-center gap-1 border border-border px-2 py-1 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        aria-label="Sign out"
      >
        <LogOut className="h-3 w-3" />
      </button>
    </div>
  );
}
