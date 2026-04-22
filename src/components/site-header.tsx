import { Link, useLocation } from "@tanstack/react-router";
import { Newspaper, Bookmark, Search } from "lucide-react";
import { useEffect, useState } from "react";

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
    { to: "/search", label: "Search", icon: Search },
    { to: "/bookmarks", label: "Saved", icon: Bookmark },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground">
            <span className="font-serif text-lg font-bold leading-none">N</span>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-serif text-base font-bold tracking-tight">NEWSROOM</span>
            <span className="ticker-text text-[9px] text-muted-foreground uppercase tracking-widest">
              Live Wire
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
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
                  "flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider transition-colors",
                  "border-b-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
            <span className="ticker-text text-[10px] uppercase tracking-widest text-muted-foreground">
              Live
            </span>
          </div>
          <LiveTime />
        </div>
      </div>
    </header>
  );
}
