import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/changelog")({ component: Page });
function Page() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from("changelogs").select("*").order("release_date", { ascending: false }).then(({ data }) => setItems(data ?? [])); }, []);
  return (<>
    <PageHeader page="changelog" eyebrow="CHANGELOG" fallbackTitle="Changelog" />
    <PageShell><div className="space-y-4">
      {items.map((c) => (
        <div key={c.id} className="glass rounded-xl p-6">
          <div className="flex justify-between items-baseline">
            <div className="text-xl font-light"><span className="text-ice">v{c.version}</span></div>
            <div className="text-xs text-muted-foreground">{new Date(c.release_date).toLocaleDateString()}</div>
          </div>
          {c.notes && <div className="text-sm text-muted-foreground mt-1">{c.notes}</div>}
          <ul className="mt-3 text-sm text-muted-foreground space-y-1">
            {(c.changes as string[]).map((x, i) => <li key={i}>— {x}</li>)}
          </ul>
        </div>
      ))}
    </div></PageShell>
  </>);
}
