import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { Reveal } from "@/components/Motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PurchaseModal } from "@/components/PurchaseModal";
import { getPrice } from "@/lib/prices";

export const Route = createFileRoute("/products")({ component: Page });

function Page() {
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  useEffect(() => { supabase.from("products").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setProducts(data ?? [])); }, []);
  return (
    <>
      <PageHeader page="products" eyebrow="THE SUITE" fallbackTitle="Three tiers. One philosophy." fallbackBody="Choose the level of protection that matches your threat model." />
      <PageShell>
        <div className="grid md:grid-cols-3 gap-6">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={i * 100}>
              <div className="tilt-card glass rounded-2xl p-8 h-full flex flex-col">
                <div className="text-xs tracking-brand text-ice">{p.tier.toUpperCase()}</div>
                <div className="mt-3 text-3xl font-light">{p.name}</div>
                <div className="mt-2 text-sm text-muted-foreground flex-1">{p.description}</div>
                <div className="mt-6 text-4xl font-light text-chrome">${getPrice(p.product_key, p.price_cents).toFixed(2)}</div>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  {(p.features as string[]).map((f) => <li key={f}>— {f}</li>)}
                </ul>
                <button onClick={() => setSelected(p)} className="btn-ice mt-8">Purchase</button>
              </div>
            </Reveal>
          ))}
        </div>
      </PageShell>
      {selected && <PurchaseModal product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
