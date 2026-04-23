import { useState } from "react";
import { Sparkles } from "lucide-react";
import { InterestsModal } from "@/components/interests-modal";
import { useInterests } from "@/lib/use-interests";

interface Props {
  variant?: "header" | "footer";
}

export function InterestsButton({ variant = "header" }: Props) {
  const [open, setOpen] = useState(false);
  const { interests } = useInterests();
  const count =
    interests.categories.length + interests.topics.length + (interests.country ? 1 : 0);

  if (variant === "footer") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ticker-text uppercase tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
        >
          <Sparkles className="h-3 w-3" />
          Select interests
          {count > 0 && <span className="text-primary">({count})</span>}
        </button>
        <InterestsModal open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Select interests"
        title="Personalize your feed"
        className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1.5 ticker-text text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground border border-border hover:border-foreground transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        <span>Interests</span>
        {count > 0 && <span className="text-primary">{count}</span>}
      </button>
      <InterestsModal open={open} onOpenChange={setOpen} />
    </>
  );
}
