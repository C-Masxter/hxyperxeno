import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function StatusList() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from("system_status").select("*").order("service_name").then(({ data }) => setItems(data ?? [])); }, []);
  const color = (s: string) => s === "operational" ? "text-emerald-400" : s === "degraded" ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-2">
      {items.map((s) => (
        <div key={s.id} className="glass rounded-xl p-5 flex justify-between items-center">
          <div className="text-sm">{s.service_name}</div>
          <div className={`text-xs tracking-display ${color(s.status)}`}>● {s.status.toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/status")({
  component: () => (<><PageHeader page="status" eyebrow="LIVE" fallbackTitle="Status" fallbackBody="Real-time health of all HYPER XENO services." /><PageShell><StatusList /></PageShell></>)
});
