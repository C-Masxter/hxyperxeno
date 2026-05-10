import { useEffect, useState } from "react";

export function IntroLoader() {
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem("hx-intro") === "1";
  });
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => {
      sessionStorage.setItem("hx-intro", "1");
      setDone(true);
    }, 2600);
    return () => clearTimeout(t);
  }, [done]);
  if (done) return null;
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
        INITIALIZING DEFENSE GRID
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
  const dots = Array.from({ length: 30 });
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {dots.map((_, i) => (
        <span key={i}
          className="absolute rounded-full bg-ice/30"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `bob ${6 + Math.random() * 8}s ease-in-out ${Math.random() * 4}s infinite`,
            opacity: 0.3 + Math.random() * 0.4,
          }} />
      ))}
    </div>
  );
}
