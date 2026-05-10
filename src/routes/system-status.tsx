import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/system-status")({ component: Page });
function Page() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from("system_status").select("*").order("service_name").then(({ data }) => setItems(data ?? [])); }, []);
  return (<>
    <PageHeader page="system_status" eyebrow="SYSTEM" fallbackTitle="System Status" fallbackBody="Detailed view of every service component." />
    <PageShell>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs tracking-display text-muted-foreground">
            <tr><th className="text-left p-4">SERVICE</th><th className="text-left p-4">STATUS</th><th className="text-left p-4">UPDATED</th></tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-4">{s.service_name}</td>
                <td className="p-4 text-ice">{s.status}</td>
                <td className="p-4 text-muted-foreground">{new Date(s.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  </>);
}
