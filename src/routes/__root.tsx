import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { OfflineBanner } from "@/components/offline-banner";
import { InterestsAutoPrompt } from "@/components/interests-auto-prompt";
import { InterestsButton } from "@/components/interests-button";

import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 headline text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-primary px-4 py-2 text-sm font-medium uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
          >
            Back to feed
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Watchfire — what developers should know, and what to do" },
      {
        name: "description",
        content:
          "Supply-chain malware, compromised packages, AI-tool attacks, exploited flaws and AI-platform changes — from advisory databases, the researchers who find them and the platforms' own feeds, each with what to do.",
      },
      { property: "og:title", content: "Watchfire — what developers should know, and what to do" },
      {
        property: "og:description",
        content: "Supply-chain malware, compromised packages and exploited flaws, each with what to do.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Watchfire — what developers should know, and what to do" },
      {
        name: "twitter:description",
        content: "Supply-chain malware, compromised packages and exploited flaws, each with what to do.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/watchfire.svg" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Fresh Reads — Tech news feed",
        href: "https://nexlabz.github.io/watchfire-feed/feed.xml",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background flex flex-col">
        <OfflineBanner />
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border py-6 mt-12">
          <div className="mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="ticker-text uppercase tracking-widest">
              © {new Date().getFullYear()} Watchfire
            </span>
            <InterestsButton variant="footer" />
            <span className="ticker-text uppercase tracking-widest">
              Powered by GNews
            </span>
          </div>
        </footer>
        <InterestsAutoPrompt />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: "0",
            },
          }}
        />
      </div>
    </QueryClientProvider>
  );
}
