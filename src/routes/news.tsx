import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/news")({ component: Page });
function Page() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from("news_posts").select("*").eq("published", true).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? [])); }, []);
  return (<>
    <PageHeader page="news" eyebrow="NEWS" fallbackTitle="News & Updates" />
    <PageShell><div className="grid md:grid-cols-2 gap-4">
      {items.map((p) => (
        <article key={p.id} className="glass rounded-xl p-6">
          <div className="text-xs tracking-display text-ice">{new Date(p.created_at).toLocaleDateString()}</div>
          <h3 className="text-xl font-light mt-2">{p.title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{p.body}</p>
        </article>
      ))}
    </div></PageShell>
  </>);
}
