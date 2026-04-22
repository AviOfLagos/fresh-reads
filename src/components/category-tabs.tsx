import { Link, useNavigate } from "@tanstack/react-router";
import { CATEGORIES, type CategoryId } from "@/lib/news-types";

export function CategoryTabs({ active }: { active: CategoryId }) {
  const navigate = useNavigate();
  return (
    <div className="border-b border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-2 sm:px-4">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide -mx-1 py-1 sm:gap-1">
          {CATEGORIES.map((c) => {
            const isActive = c.id === active;
            return (
              <Link
                key={c.id}
                to="/"
                search={{ category: c.id }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate({ to: "/", search: { category: c.id } });
                }}
                className={[
                  "shrink-0 px-2 py-2 text-[10px] uppercase tracking-wider transition-all whitespace-nowrap sm:px-3 sm:py-2.5 sm:text-xs",
                  "relative",
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {c.label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary animate-fade-in" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
