import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Editable } from "@/components/Editable";
import { Reveal, Counter, Typer } from "@/components/Motion";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<any | null>(null);
  useEffect(() => {
    supabase.from("products").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setProducts(data ?? []));
    supabase.from("announcements").select("*").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setAnnouncement(data));
  }, []);

  return (
    <div className="relative">
      {announcement && (
        <div className="glass mx-auto mt-6 max-w-3xl rounded-full px-5 py-2 text-center text-xs tracking-display text-muted-foreground">
          <span className="text-ice">{announcement.title.toUpperCase()}</span> — {announcement.body}
        </div>
      )}

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-32">
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <div className="text-xs tracking-brand text-muted-foreground mb-6">CYBERSECURITY · REIMAGINED</div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-5xl md:text-7xl font-light leading-[1.05] tracking-tight">
              <Editable as="span" page="home" section="hero_title" fallback="Defend the impossible." />
            </h1>
          </Reveal>
          <Reveal delay={250}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              <Editable as="span" page="home" section="hero_subtitle" fallback="HYPER XENO is the next-generation cybersecurity suite built for those who refuse to compromise." />
            </p>
          </Reveal>
          <Reveal delay={400}>
            <div className="mt-8 text-sm text-ice tracking-display h-6">
              <Typer words={["REAL-TIME PROTECTION", "QUANTUM ENCRYPTION", "ZERO-DAY DEFENSE", "AI HEURISTICS"]} />
            </div>
          </Reveal>
          <Reveal delay={550}>
            <div className="mt-10 flex justify-center gap-3">
              <Link to="/pricing" className="btn-ice">Explore Pricing</Link>
              <Link to="/demo" className="btn-ghost-ice">Watch Live Demo</Link>
            </div>
          </Reveal>
        </div>

        {/* floating chrome orb */}
        <div className="float-bob absolute -z-10 left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20" style={{ background: "radial-gradient(circle, oklch(0.82 0.13 230 / 0.6), transparent 70%)" }} />
      </section>

      {/* Stats */}
      <section className="px-6">
        <div className="mx-auto max-w-6xl glass rounded-2xl px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <Reveal><div><div className="text-4xl md:text-5xl font-light text-chrome"><Counter to={2400000} suffix="+" /></div><div className="mt-2 text-xs tracking-display text-muted-foreground">PROTECTED SYSTEMS</div></div></Reveal>
          <Reveal delay={150}><div><div className="text-4xl md:text-5xl font-light text-chrome"><Counter to={999} />‰</div><div className="mt-2 text-xs tracking-display text-muted-foreground">DETECTION RATE</div></div></Reveal>
          <Reveal delay={300}><div><div className="text-4xl md:text-5xl font-light text-chrome">&lt;<Counter to={1} />ms</div><div className="mt-2 text-xs tracking-display text-muted-foreground">RESPONSE TIME</div></div></Reveal>
        </div>
      </section>

      {/* Product tiers */}
      <section className="px-6 pt-32">
        <Reveal><div className="text-center mb-16">
          <div className="text-xs tracking-brand text-muted-foreground mb-3">THREE TIERS</div>
          <h2 className="text-3xl md:text-5xl font-light">Built for every threat model</h2>
        </div></Reveal>
        <div className="mx-auto max-w-6xl grid md:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={i * 120}>
              <div className="tilt-card glass rounded-2xl p-8 h-full">
                <div className="text-xs tracking-brand text-ice">{p.tier.toUpperCase()}</div>
                <div className="mt-3 text-2xl font-light">{p.name}</div>
                <div className="mt-2 text-sm text-muted-foreground">{p.description}</div>
                <div className="mt-6 text-3xl font-light text-chrome">${(p.price_cents/100).toFixed(2)}</div>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  {(p.features as string[]).map((f) => <li key={f}>— {f}</li>)}
                </ul>
                <Link to="/pricing" className="btn-ghost-ice mt-8 w-full">Select tier</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="px-6 pt-32">
        <Reveal>
          <div className="mx-auto max-w-4xl glass rounded-2xl p-12 text-center">
            <div className="text-xs tracking-brand text-ice mb-4">TRUSTED GLOBALLY</div>
            <p className="text-2xl md:text-3xl font-light leading-relaxed">"HYPER XENO doesn't feel like security software. It feels like a guardian."</p>
            <div className="mt-6 text-sm text-muted-foreground">— Anonymous CISO, Fortune 500</div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
