import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { Reveal } from "@/components/Motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/features")({ component: Page });

function Page() {
  const [features, setFeatures] = useState<any[]>([]);
  useEffect(() => { supabase.from("feature_blocks").select("*").eq("page_id", "home").eq("enabled", true).order("sort_order").then(({ data }) => setFeatures(data ?? [])); }, []);
  return (
    <>
      <PageHeader page="features" eyebrow="CAPABILITIES" fallbackTitle="A new defense paradigm" fallbackBody="Every layer engineered for elegance, speed, and silence." />
      <PageShell>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <Reveal key={f.id} delay={i * 100}>
              <div className="tilt-card glass rounded-2xl p-8 h-full">
                <div className="text-xs tracking-brand text-ice mb-3">{f.icon?.toUpperCase()}</div>
                <div className="text-2xl font-light">{f.title}</div>
                <p className="mt-3 text-sm text-muted-foreground">{f.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </PageShell>
    </>
  );
}
