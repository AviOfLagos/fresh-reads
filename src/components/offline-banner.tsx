import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground animate-slide-down">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2">
        <WifiOff className="h-4 w-4" />
        <span className="ticker-text text-xs uppercase tracking-widest">
          You are offline · Showing cached articles
        </span>
      </div>
    </div>
  );
}
