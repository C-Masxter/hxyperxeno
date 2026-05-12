import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function PurchaseModal({ product, onClose }: { product: any; onClose: () => void }) {
  const { userId } = useSession();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cashapp_username: "" });
  const [methods, setMethods] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { supabase.from("payment_methods").select("*").eq("enabled", true).order("sort_order").then(({ data }) => setMethods(data ?? [])); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast.error("Please log in first"); nav({ to: "/login" }); return; }
    setSubmitting(true);
    let ip = "";
    try { ip = (await fetch("https://api.ipify.org?format=json").then((r) => r.json())).ip ?? ""; } catch {}
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const device = typeof navigator !== "undefined"
      ? `${navigator.platform || "?"} · ${(navigator as any).language || ""} · ${window.screen.width}x${window.screen.height}`
      : "";
    const { error } = await supabase.from("purchase_requests").insert({
      user_id: userId, product_key: product.product_key, amount_cents: product.price_cents,
      ip_address: ip, user_agent: ua, device_info: device,
      ...form,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Request submitted — admin will verify your CashApp payment");
    onClose();
    nav({ to: "/dashboard" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in" onClick={onClose}>
      <div className="glass-strong rounded-2xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs tracking-brand text-ice mb-2">PURCHASE</div>
        <div className="text-2xl font-light">{product.name} — ${(product.price_cents/100).toFixed(2)}</div>
        <div className="mt-6 rounded-lg border border-ice/30 bg-ice/5 p-4">
          <div className="text-xs tracking-display text-ice">PAYMENT INSTRUCTION</div>
          <div className="mt-2 text-sm">Send <span className="text-chrome font-medium">${(product.price_cents/100).toFixed(2)}</span> via CashApp to <span className="text-ice font-medium">$CMasxter</span></div>
          <div className="mt-2 text-xs text-muted-foreground">An admin will manually verify and unlock your access.</div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-3">
          {[
            ["full_name","Full Name"],["email","Email"],["phone","Phone"],["cashapp_username","CashApp username (e.g. $you)"]
          ].map(([k, label]) => (
            <input key={k} required placeholder={label} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          ))}
          {methods.length > 0 && (
            <div className="text-xs text-muted-foreground">Other methods: {methods.map((m) => m.name).join(", ")}</div>
          )}
          <div className="flex gap-2 pt-3">
            <button type="button" onClick={onClose} className="btn-ghost-ice flex-1">Cancel</button>
            <button disabled={submitting} type="submit" className="btn-ice flex-1">{submitting ? "Submitting…" : "Submit Request"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
