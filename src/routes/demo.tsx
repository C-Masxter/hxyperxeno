import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/demo")({ component: Page });

function Page() {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    const events = ["TCP scan blocked from 89.42.x.x","Heuristic match: trojan.gen.b","Quantine: file.exe","Quantum-key handshake","Zero-day vector neutralized","Behavioral anomaly suppressed"];
    let i = 0;
    const t = setInterval(() => { setLog((l) => [`[${new Date().toLocaleTimeString()}] ${events[i % events.length]}`, ...l].slice(0, 14)); i++; }, 900);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <PageHeader page="demo" eyebrow="LIVE" fallbackTitle="Live Protection Demo" fallbackBody="Watch HYPER XENO intercept simulated threats in real time." />
      <PageShell>
        <div className="glass rounded-2xl p-6 relative overflow-hidden">
          <div className="scan-line" />
          <div className="text-xs tracking-display text-ice mb-3">DEFENSE STREAM</div>
          <div className="font-mono text-sm space-y-1 min-h-[300px]">
            {log.map((l, i) => <div key={i} className="text-muted-foreground"><span className="text-ice">●</span> {l}</div>)}
          </div>
        </div>
      </PageShell>
    </>
  );
}
