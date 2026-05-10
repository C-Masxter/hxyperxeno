import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/faq")({ component: Page });
function Page() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { supabase.from("faq_items").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setItems(data ?? [])); }, []);
  return (
    <>
      <PageHeader page="faq" eyebrow="HELP" fallbackTitle="Frequently Asked Questions" />
      <PageShell>
        <div className="space-y-3">
          {items.map((q) => (
            <details key={q.id} className="glass rounded-xl p-5 group">
              <summary className="cursor-pointer text-lg font-light list-none flex justify-between items-center">{q.question}<span className="text-ice text-sm">+</span></summary>
              <p className="mt-3 text-muted-foreground text-sm">{q.answer}</p>
            </details>
          ))}
        </div>
      </PageShell>
    </>
  );
}
