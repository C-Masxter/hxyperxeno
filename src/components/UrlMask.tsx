import { useEffect } from "react";
import { useRouterState, useRouter } from "@tanstack/react-router";

// Visual URL obfuscation.
// Real path is kept internally for routing; the address bar shows a fake path.
// Format: /settings/values/root/<base64url(realPath)>
const PREFIX = "/settings/values/root/";

function encodePath(real: string): string {
  try {
    const b64 = btoa(unescape(encodeURIComponent(real)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return PREFIX + b64;
  } catch {
    return PREFIX;
  }
}

function decodePath(fake: string): string | null {
  if (!fake.startsWith(PREFIX)) return null;
  const token = fake.slice(PREFIX.length).split("/")[0];
  if (!token) return "/";
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    return decodeURIComponent(escape(atob(b64 + pad)));
  } catch {
    return null;
  }
}

export function UrlMask() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const hash = useRouterState({ select: (s) => s.location.hash });

  // On initial load: if URL is a masked one, navigate to the real path.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const here = window.location.pathname;
    if (here.startsWith(PREFIX)) {
      const real = decodePath(here);
      if (real && real !== here) {
        router.navigate({ to: real, replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After router settles, rewrite the visible URL to the masked form.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith(PREFIX)) return; // already masked
    const masked =
      encodePath(pathname) + (search ? `?${search}` : "") + (hash ? `#${hash}` : "");
    try {
      window.history.replaceState(window.history.state, "", masked);
    } catch {
      /* noop */
    }
  }, [pathname, search, hash]);

  return null;
}
