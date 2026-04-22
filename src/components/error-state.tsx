import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
  icon?: "error" | "offline";
}

export function ErrorState({ message, onRetry, icon = "error" }: Props) {
  const Icon = icon === "offline" ? WifiOff : AlertTriangle;
  return (
    <div className="flex flex-col items-center justify-center border border-border bg-surface px-6 py-12 text-center animate-fade-in">
      <div className="flex h-12 w-12 items-center justify-center bg-destructive/10 text-destructive mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="headline text-lg font-semibold mb-1">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-medium uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  icon: Icon,
}: {
  title: string;
  message: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center border border-border bg-surface px-6 py-16 text-center animate-fade-in">
      <div className="flex h-12 w-12 items-center justify-center bg-muted text-muted-foreground mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="headline text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{message}</p>
    </div>
  );
}
