import { Link, useLocation } from "@tanstack/react-router";
import { Newspaper, Bookmark, Search, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { NotificationsButton } from "@/components/notifications-button";
import { AuthButton } from "@/components/auth-button";
import { InterestsButton } from "@/components/interests-button";

function LiveTime() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow(
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }) + " UTC" + (-d.getTimezoneOffset() / 60 >= 0 ? "+" : "") + (-d.getTimezoneOffset() / 60),
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="ticker-text text-xs text-muted-foreground">{now}</span>;
}

export function SiteHeader() {
  const location = useLocation();
  const navItems = [
    { to: "/", label: "Feed", icon: Newspaper },
    { to: "/events", label: "Events", icon: Calendar },
    { to: "/search", label: "Search", icon: Search },
    { to: "/bookmarks", label: "Saved", icon: Bookmark },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-1 px-2 sm:h-14 sm:gap-4 sm:px-4">
        <Link to="/" className="flex items-center gap-1.5 group shrink-0">
          <div className="flex h-7 w-7 items-center justify-center bg-primary text-primary-foreground sm:h-8 sm:w-8">
            <span className="font-serif text-base font-bold leading-none sm:text-lg">N</span>
          </div>
          <div className="hidden xs:flex flex-col leading-tight">
            <span className="font-serif text-sm font-bold tracking-tight sm:text-base">NEWSROOM</span>
            <span className="ticker-text text-[8px] text-muted-foreground uppercase tracking-widest sm:text-[9px]">
              Live Wire
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-1.5 px-2 py-2 text-[11px] uppercase tracking-wider transition-colors sm:px-3 sm:text-xs",
                  "border-b-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
                aria-label={item.label}
              >
                <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <InterestsButton />
          <NotificationsButton />
          <AuthButton />
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
            <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
              Live
            </span>
          </div>
          <div className="hidden lg:block">
            <LiveTime />
          </div>
        </div>
      </div>
    </header>
  );
}
