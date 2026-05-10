import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Navbar, Footer } from "@/components/Layout";
import { IntroLoader, CursorGlow, Particles } from "@/components/Effects";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl font-light tracking-brand text-ice">404</div>
        <div className="mt-4 text-sm text-muted-foreground tracking-display">PAGE NOT FOUND</div>
        <a href="/" className="btn-ice mt-8 inline-flex">Return Home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl text-ice tracking-display">SYSTEM FAULT</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button className="btn-ice mt-6" onClick={() => { router.invalidate(); reset(); }}>Retry</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HYPER XENO — Premium Next-Gen Cybersecurity" },
      { name: "description", content: "Premium next-generation cybersecurity suite. The luxury alternative to Windows Defender." },
      { name: "author", content: "HYPER XENO" },
      { property: "og:title", content: "HYPER XENO" },
      { property: "og:description", content: "Premium next-generation cybersecurity suite." },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <IntroLoader />
      <CursorGlow />
      <Particles />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1"><Outlet /></main>
        <Footer />
      </div>
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  );
}
