import { useEffect, useRef, useState } from "react";

export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { setTimeout(() => setShown(true), delay); obs.disconnect(); } });
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={`reveal ${shown ? "in" : ""}`}>{children}</div>;
}

export function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        const start = performance.now();
        const dur = 1600;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          setN(Math.floor(eased * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      });
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

export function Typer({ words, className = "" }: { words: string[]; className?: string }) {
  const [text, setText] = useState("");
  const [wi, setWi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[wi % words.length];
    const t = setTimeout(() => {
      if (!del) {
        const next = w.slice(0, text.length + 1);
        setText(next);
        if (next === w) setTimeout(() => setDel(true), 1400);
      } else {
        const next = w.slice(0, text.length - 1);
        setText(next);
        if (next === "") { setDel(false); setWi((i) => i + 1); }
      }
    }, del ? 35 : 60);
    return () => clearTimeout(t);
  }, [text, del, wi, words]);
  return <span className={className}>{text}<span className="text-ice animate-pulse">|</span></span>;
}
