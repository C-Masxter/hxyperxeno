import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/appeals")({ component: Page });

function Page() {
  const { userId } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ reason: "", message: "" });
  const load = () => userId && supabase.from("appeals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => setItems(data ?? []));
  useEffect(() => { load(); }, [userId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return toast.error("Login first");
    const { error } = await supabase.from("appeals").insert({ ...form, user_id: userId });
    if (error) return toast.error(error.message);
    setForm({ reason: "", message: "" }); load(); toast.success("Appeal submitted");
  };
  return (<>
    <PageHeader page="appeals" eyebrow="APPEALS" fallbackTitle="Submit an appeal" fallbackBody="Disputes are reviewed by the operations team." />
    <PageShell>
      {userId ? (
        <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-3 mb-8">
          <input required placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <textarea required placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice min-h-32" />
          <button className="btn-ice">Submit appeal</button>
        </form>
      ) : <div className="glass rounded-xl p-6 text-muted-foreground">Login to submit an appeal.</div>}
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="glass rounded-xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-lg">{a.reason}</div>
                <div className="text-sm text-muted-foreground mt-1">{a.message}</div>
                {a.admin_response && <div className="mt-3 text-sm border-l-2 border-ice pl-3"><span className="text-ice text-xs tracking-display">RESPONSE</span><div>{a.admin_response}</div></div>}
              </div>
              <div className={`text-xs tracking-display px-3 py-1 rounded-full ${a.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : a.status === "denied" ? "bg-red-500/20 text-red-300" : "bg-ice/20 text-ice"}`}>{a.status.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  </>);
}
