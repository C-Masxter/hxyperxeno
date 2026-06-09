import { useEffect } from "react";
import { useRouterState, useRouter } from "@tanstack/react-router";

// Visual URL obfuscation.
// Real path drives routing; address bar shows /settings/values/root/<token>.
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

export function decodeMaskedPath(fake: string): string | null {
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith(PREFIX)) {
      const real = decodeMaskedPath(pathname);
      if (real && real !== pathname) {
        router.navigate({ to: real, replace: true });
      }
      return;
    }
    const { search, hash } = window.location;
    const masked = encodePath(pathname) + (search || "") + (hash || "");
    try {
      window.history.replaceState(window.history.state, "", masked);
    } catch {
      /* noop */
    }
  }, [pathname, router]);

  return null;
}
