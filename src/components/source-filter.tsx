import { useSources } from "@/lib/use-sources";
import { Check } from "lucide-react";

export function SourceFilter() {
  const { all, isEnabled, toggle } = useSources();
  const enabledCount = all.filter((s) => isEnabled(s.id)).length;

  // With a single live provider there's nothing useful to toggle. Hide the
  // control entirely until a second provider is wired up.
  if (all.length < 2) return null;

  return (
    <div className="border border-border bg-surface/50 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
          Sources
        </div>
        <div className="ticker-text text-[10px] uppercase tracking-widest text-primary">
          {enabledCount}/{all.length} on
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2">
        {all.map((s) => {
          const on = isEnabled(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              title={s.description}
              className={[
                "group inline-flex items-center gap-1.5 border px-2 py-1 text-[11px] uppercase tracking-wider transition-colors",
                on
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {on ? (
                <Check className="h-3 w-3 text-primary" />
              ) : (
                <span className="h-3 w-3" />
              )}
              <span className="font-mono">{s.short}</span>
              <span className="hidden xs:inline">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
