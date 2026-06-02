import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { Reveal } from "@/components/Motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseModal } from "@/components/PurchaseModal";
import { getPrice } from "@/lib/prices";

export const Route = createFileRoute("/pricing")({ component: Page });

function Page() {
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  useEffect(() => {
    supabase.from("pricing_plans").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setPlans(data ?? []));
    supabase.from("products").select("*").then(({ data }) => setProducts(data ?? []));
  }, []);
  return (
    <>
      <PageHeader page="pricing" eyebrow="PRICING" fallbackTitle="Lifetime. No subscriptions." fallbackBody="One payment. Permanent protection. Zero telemetry tax." />
      <PageShell>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p, i) => {
            const product = products.find((x) => x.product_key === p.plan_key);
            return (
              <Reveal key={p.id} delay={i * 100}>
                <div className={`tilt-card glass rounded-2xl p-8 h-full flex flex-col ${p.highlight ? "ice-glow" : ""}`}>
                  {p.highlight && <div className="text-xs tracking-brand text-ice mb-3">RECOMMENDED</div>}
                  <div data-edit-key={`pricing:plan:${p.plan_key}:name`} className="text-2xl font-light">{p.name}</div>
                  <div data-edit-key={`pricing:plan:${p.plan_key}:price`} className="mt-4 text-5xl font-light text-chrome">${getPrice(p.plan_key, p.price_cents).toFixed(2)}</div>
                  <div data-edit-key={`pricing:plan:${p.plan_key}:period`} className="text-xs text-muted-foreground tracking-display mt-1">{p.period.toUpperCase()}</div>
                  <ul className="mt-6 space-y-2 text-sm text-muted-foreground flex-1">
                    {(p.features as string[]).map((f, featureIndex) => <li key={f} data-edit-key={`pricing:plan:${p.plan_key}:feature:${featureIndex}`}>— {f}</li>)}
                  </ul>
                  <button onClick={() => product && setSelected(product)} className={p.highlight ? "btn-ice mt-8" : "btn-ghost-ice mt-8"}>Get {p.name}</button>
                </div>
              </Reveal>
            );
          })}
        </div>
      </PageShell>
      {selected && <PurchaseModal product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
