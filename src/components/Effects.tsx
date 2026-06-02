import { useEffect, useMemo, useState } from "react";

export function IntroLoader({ duration = 2600, label = "INITIALIZING DEFENSE GRID", forceKey }: { duration?: number; label?: string; forceKey?: string | number } = {}) {
  // Start hidden on both server and client to avoid hydration mismatch,
  // then reveal on the client via effect.
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(t);
  }, [duration, forceKey]);
  if (!show) return null;
  const letters = "HYPERXENO".split("");
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animated-gradient">
      <div className="flex gap-3 md:gap-5">
        {letters.map((l, i) => (
          <span key={i}
            className="text-4xl md:text-7xl font-light tracking-brand text-ice"
            style={{
              animation: `intro-letter 1.2s cubic-bezier(.2,.8,.2,1) ${i * 0.12}s both`,
              opacity: 0,
            }}>
            {l}
          </span>
        ))}
      </div>
      <div className="absolute bottom-12 text-xs tracking-brand text-muted-foreground" style={{ animation: "fade-up 1s 1.8s both" }}>
        {label}
      </div>
    </div>
  );
}

export function CursorGlow() {
  useEffect(() => {
    const el = document.createElement("div");
    el.className = "cursor-glow";
    document.body.appendChild(el);
    const move = (e: MouseEvent) => { el.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`; };
    window.addEventListener("mousemove", move);
    return () => { window.removeEventListener("mousemove", move); el.remove(); };
  }, []);
  return null;
}

export function Particles() {
  // Render nothing during SSR/first-paint so server HTML matches client HTML,
  // then mount the randomized dots after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const dots = useMemo(() => Array.from({ length: 30 }).map(() => ({
    w: Math.random() * 3 + 1,
    h: Math.random() * 3 + 1,
    l: Math.random() * 100,
    t: Math.random() * 100,
    d: 6 + Math.random() * 8,
    s: Math.random() * 4,
    o: 0.3 + Math.random() * 0.4,
  })), []);
  if (!mounted) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {dots.map((d, i) => (
        <span key={i}
          className="absolute rounded-full bg-ice/30"
          style={{
            width: `${d.w}px`,
            height: `${d.h}px`,
            left: `${d.l}%`,
            top: `${d.t}%`,
            animation: `bob ${d.d}s ease-in-out ${d.s}s infinite`,
            opacity: d.o,
          }} />
      ))}
    </div>
  );
}
