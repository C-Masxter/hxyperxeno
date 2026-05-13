import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSession, logout } from "@/lib/auth";
import { useEditMode } from "@/lib/cms";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/products", label: "Products" },
  { to: "/pricing", label: "Pricing" },
  { to: "/security", label: "Security" },
  { to: "/hyperxeno-ai", label: "HyperXeno AI" },
  { to: "/news", label: "News" },
];

export function Navbar() {
  const session = useSession();
  const { enabled, toggle } = useEditMode();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f(); window.addEventListener("scroll", f);
    return () => window.removeEventListener("scroll", f);
  }, []);
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? "glass-strong" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-sm tracking-brand font-semibold">
          <span className="text-chrome">HYPER</span> <span className="text-ice">XENO</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`transition hover:text-ice ${path === n.to ? "text-ice" : "text-muted-foreground"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session.isAdmin && (
            <button onClick={toggle} className={`text-xs px-3 py-1.5 rounded border transition ${enabled ? "bg-ice text-black border-ice" : "border-border text-muted-foreground hover:text-ice hover:border-ice"}`}>
              {enabled ? "EDIT MODE ON" : "Edit Mode"}
            </button>
          )}
          {session.userId ? (
            <>
              <Link to="/xenotext" className="text-sm text-muted-foreground hover:text-ice">XenoText</Link>
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-ice">Dashboard</Link>
              {session.isAdmin && <Link to="/admin" className="text-sm text-ice">Admin</Link>}
              <button onClick={logout} className="text-sm text-muted-foreground hover:text-ice">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-ice">Login</Link>
              <Link to="/register" className="btn-ice">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const FOOTER_COLS = [
  { title: "Product", links: [["/features","Features"],["/products","Products"],["/pricing","Pricing"],["/demo","Live Demo"]] },
  { title: "Company", links: [["/about","About"],["/credits","Credits"],["/news","News"],["/changelog","Changelog"]] },
  { title: "Support", links: [["/faq","FAQ"],["/contact","Contact"],["/community","Community"],["/appeals","Appeals"]] },
  { title: "Trust", links: [["/security","Security"],["/status","Status"],["/system-status","System Status"],["/terms","Terms"],["/privacy","Privacy"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2">
          <div className="text-sm tracking-brand font-semibold mb-3">
            <span className="text-chrome">HYPER</span> <span className="text-ice">XENO</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">Premium next-generation cybersecurity. Built for those who refuse to compromise.</p>
        </div>
        {FOOTER_COLS.map((c) => (
          <div key={c.title}>
            <div className="text-xs tracking-display text-chrome mb-4">{c.title.toUpperCase()}</div>
            <ul className="space-y-2 text-sm">
              {c.links.map(([href, label]) => (
                <li key={href as string}><Link to={href as any} className="text-muted-foreground hover:text-ice">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} HYPER XENO. All rights reserved.
      </div>
    </footer>
  );
}
