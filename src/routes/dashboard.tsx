import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/Page";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({ component: Page });

function Page() {
  const { userId, username, loading, isAdmin } = useSession();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from("purchase_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).then(({ data }) => setPurchases(data ?? []));
    supabase.from("notifications").select("*").or(`user_id.eq.${userId},user_id.is.null`).order("created_at", { ascending: false }).limit(20).then(({ data }) => setNotifs(data ?? []));
  }, [userId]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!userId) return (
    <div className="p-12 text-center">
      <div className="text-xl">Sign in to view your dashboard</div>
      <Link to="/login" className="btn-ice mt-6 inline-flex">Sign in</Link>
    </div>
  );

  return (<>
    <PageHeader page="dashboard" eyebrow={`SIGNED IN AS ${username?.toUpperCase()}`} fallbackTitle="Your Dashboard" fallbackBody="Manage purchases, view notifications, and track appeals." />
    <PageShell>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-xl p-6"><div className="text-xs tracking-display text-muted-foreground">PURCHASES</div><div className="text-3xl font-light text-chrome mt-2">{purchases.length}</div></div>
        <div className="glass rounded-xl p-6"><div className="text-xs tracking-display text-muted-foreground">NOTIFICATIONS</div><div className="text-3xl font-light text-chrome mt-2">{notifs.length}</div></div>
        <div className="glass rounded-xl p-6"><div className="text-xs tracking-display text-muted-foreground">ROLE</div><div className="text-3xl font-light text-ice mt-2">{isAdmin ? "ADMIN" : "USER"}</div></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-6">
          <div className="text-xs tracking-brand text-ice mb-3">PURCHASE HISTORY</div>
          {purchases.length === 0 ? <div className="text-muted-foreground text-sm">No purchases yet. <Link to="/pricing" className="text-ice">View pricing</Link>.</div> :
            purchases.map((p) => (
              <div key={p.id} className="border-t border-border py-3 flex justify-between items-center text-sm">
                <div><div>{p.product_key.toUpperCase()}</div><div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div></div>
                <div className={`text-xs px-2 py-1 rounded-full ${p.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : p.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-ice/20 text-ice"}`}>{p.status}</div>
              </div>
            ))
          }
        </div>
        <div className="glass rounded-xl p-6">
          <div className="text-xs tracking-brand text-ice mb-3">NOTIFICATIONS</div>
          {notifs.length === 0 ? <div className="text-muted-foreground text-sm">No notifications.</div> :
            notifs.map((n) => (
              <div key={n.id} className="border-t border-border py-3 text-sm">
                <div>{n.message}</div>
                <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          }
        </div>
      </div>
    </PageShell>
  </>);
}
