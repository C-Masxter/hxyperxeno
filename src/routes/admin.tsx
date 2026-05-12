import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";
import { saveSection, useEditMode } from "@/lib/cms";

export const Route = createFileRoute("/admin")({ component: Page });

const TAB_GROUPS: { group: string; tabs: string[] }[] = [
  { group: "Dashboard", tabs: ["Overview"] },
  { group: "Content", tabs: ["Visual Editor", "CMS Editor", "News", "Announcements", "Changelog", "FAQ", "Documentation"] },
  { group: "Commerce", tabs: ["Products", "Pricing", "Downloads", "Purchases", "Payment Methods"] },
  { group: "Users", tabs: ["Users", "Roles", "Appeals", "Notifications", "Community", "XenoText"] },
  { group: "System", tabs: ["System Status", "Site Settings", "IP Blocklist", "Sessions", "Email Templates"] },
  { group: "Logs", tabs: ["Audit Logs", "Security Logs"] },
];

function Page() {
  const { isAdmin, loading } = useSession();
  const [tab, setTab] = useState("Overview");
  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="text-xs tracking-brand text-red-400">ACCESS DENIED</div>
      <div className="text-2xl mt-3">Admin only</div>
      <Link to="/login" className="btn-ice mt-6">Sign in</Link>
    </div>
  );
  return (
    <div className="px-6 pt-12 pb-24" data-no-edit>
      <div className="mx-auto max-w-7xl">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <div className="text-xs tracking-brand text-ice">ADMIN TERMINAL</div>
            <h1 className="text-4xl font-light mt-1">Control Center</h1>
            <div className="text-xs text-muted-foreground mt-1 tracking-display">{tab.toUpperCase()}</div>
          </div>
          <span className="text-xs tracking-display text-muted-foreground">● ONLINE</span>
        </div>
        <div className="grid lg:grid-cols-[240px_1fr] gap-6">
          <aside className="glass rounded-xl p-3 max-h-[80vh] overflow-y-auto space-y-4">
            {TAB_GROUPS.map((g) => (
              <div key={g.group}>
                <div className="text-[10px] tracking-brand text-ice/70 px-3 pb-1 pt-1">{g.group.toUpperCase()}</div>
                {g.tabs.map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${tab === t ? "bg-ice/15 text-ice" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>{t}</button>
                ))}
              </div>
            ))}
          </aside>
          <section className="glass-strong rounded-xl p-6 min-h-[70vh]">
            <Tab name={tab} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Tab({ name }: { name: string }) {
  switch (name) {
    case "Overview": return <Overview />;
    case "CMS Editor": return <CmsEditor />;
    case "Visual Editor": return <VisualEditor />;
    case "Pricing": return <SimpleTable table="pricing_plans" cols={["plan_key","name","price_cents","period","highlight","enabled","sort_order"]} />;
    case "Products": return <SimpleTable table="products" cols={["product_key","name","tier","price_cents","enabled","sort_order"]} />;
    case "FAQ": return <SimpleTable table="faq_items" cols={["question","answer","sort_order","enabled"]} />;
    case "Changelog": return <SimpleTable table="changelogs" cols={["version","release_date","notes"]} />;
    case "News": return <SimpleTable table="news_posts" cols={["title","body","published"]} />;
    case "Announcements": return <SimpleTable table="announcements" cols={["title","body","type","active"]} />;
    case "System Status": return <SimpleTable table="system_status" cols={["service_name","status","message"]} />;
    case "Downloads": return <SimpleTable table="downloads" cols={["product_key","file_name","version","url","requires_approval"]} />;
    case "Purchases": return <Purchases />;
    case "Appeals": return <Appeals />;
    case "Users": return <Users />;
    case "Roles": return <Roles />;
    case "Notifications": return <Notifications />;
    case "Audit Logs": return <SimpleTable table="audit_logs" cols={["admin_id","action","target","created_at"]} readonly />;
    case "Security Logs": return <SimpleTable table="security_logs" cols={["event_type","user_id","created_at"]} readonly />;
    case "Site Settings": return <SimpleTable table="site_settings" cols={["key","value"]} />;
    case "Payment Methods": return <SimpleTable table="payment_methods" cols={["method_key","name","enabled","sort_order"]} />;
    case "IP Blocklist": return <SimpleTable table="ip_blocklist" cols={["ip","reason"]} />;
    case "Community": return <SimpleTable table="community_posts" cols={["title","body","hidden"]} />;
    case "XenoText": return <AdminMessages />;
    case "Sessions": return <Note text="Active sessions appear here. Force-logout uses Supabase Auth admin API (server-side)." />;
    case "Email Templates": return <Note text="Email is disabled in this build. Templates are UI-only stubs." />;
    case "Documentation": return <CmsEditor pageFilter="docs" />;
  }
  return null;
}

function Note({ text }: { text: string }) {
  return <div className="text-muted-foreground text-sm">{text}</div>;
}

function Overview() {
  const [stats, setStats] = useState({ users: 0, purchases: 0, appeals: 0, revenue: 0 });
  const [actualRevenue, setActualRevenue] = useState(0);
  const [override, setOverride] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const load = async () => {
    const [u, p, a, r, s] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("purchase_requests").select("*", { count: "exact", head: true }),
      supabase.from("appeals").select("*", { count: "exact", head: true }),
      supabase.from("purchase_requests").select("amount_cents").eq("status", "approved"),
      supabase.from("site_settings").select("value").eq("key", "revenue_override").maybeSingle(),
    ]);
    const computed = (r.data ?? []).reduce((sum: number, x: any) => sum + (x.amount_cents || 0), 0) / 100;
    setActualRevenue(computed);
    const ov = (s.data?.value as any)?.amount;
    setOverride(typeof ov === "number" ? ov : null);
    setStats({
      users: u.count ?? 0, purchases: p.count ?? 0, appeals: a.count ?? 0,
      revenue: typeof ov === "number" ? ov : computed,
    });
  };
  useEffect(() => { load(); }, []);
  const setRevenue = async (amount: number | null) => {
    if (amount === null) {
      await supabase.from("site_settings").delete().eq("key", "revenue_override");
    } else {
      await supabase.from("site_settings").upsert({ key: "revenue_override", value: { amount } }, { onConflict: "key" });
    }
    toast.success(amount === null ? "Reset to actual" : `Set to $${amount.toLocaleString()}`);
    setCustom(""); load();
  };
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-6">
            <div className="text-xs tracking-display text-muted-foreground">{k.toUpperCase()}</div>
            <div className="text-3xl text-chrome font-light mt-2">{k === "revenue" ? `$${(v as number).toLocaleString()}` : v}</div>
            {k === "revenue" && override !== null && <div className="text-[10px] mt-1 text-ice">OVERRIDE · actual ${actualRevenue.toLocaleString()}</div>}
          </div>
        ))}
      </div>
      <div className="glass rounded-xl p-4">
        <div className="text-xs tracking-brand text-ice mb-2">REVENUE DISPLAY</div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setRevenue(null)} className="btn-ghost-ice text-xs">Reset to actual (${actualRevenue.toLocaleString()})</button>
          {[1000, 10000, 50000, 100000, 500000].map((n) => (
            <button key={n} onClick={() => setRevenue(n)} className="text-xs px-3 py-1 rounded border border-border hover:border-ice">${n.toLocaleString()}</button>
          ))}
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom $" className="bg-input/40 border border-border rounded px-3 py-1 text-xs w-32" />
          <button onClick={() => { const n = Number(custom); if (!isNaN(n)) setRevenue(n); }} className="btn-ice text-xs">Apply</button>
        </div>
      </div>
    </div>
  );
}

function CmsEditor({ pageFilter }: { pageFilter?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const load = async () => {
    let q = supabase.from("page_content").select("*").order("page_id").order("section_id");
    if (pageFilter) q = q.eq("page_id", pageFilter);
    const { data } = await q;
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [pageFilter]);
  return (
    <div className="space-y-3">
      <div className="text-xs tracking-brand text-ice">CONTENT BLOCKS — full website text editor</div>
      {items.map((it) => {
        const key = `${it.page_id}/${it.section_id}`;
        const value = edits[key] ?? it.content_text;
        return (
          <div key={it.id} className="border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground tracking-display">{it.page_id.toUpperCase()} · {it.section_id}</div>
            <textarea value={value} onChange={(e) => setEdits({ ...edits, [key]: e.target.value })}
              className="mt-2 w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice min-h-[80px]" />
            <div className="mt-2 flex gap-2">
              <button onClick={async () => { await saveSection(it.page_id, it.section_id, value); toast.success("Saved"); load(); }} className="btn-ice text-xs">Save</button>
              <button onClick={() => { const next = { ...edits }; delete next[key]; setEdits(next); }} className="btn-ghost-ice text-xs">Reset</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VisualEditor() {
  const { enabled, toggle } = useEditMode();
  return (
    <div>
      <div className="text-xs tracking-brand text-ice mb-3">VISUAL LIVE EDITOR</div>
      <p className="text-sm text-muted-foreground">Toggle Edit Mode, then navigate to any page. Editable text shows a glowing outline; click to edit inline. Changes save instantly to the database and appear globally for all users.</p>
      <button onClick={toggle} className={`mt-6 ${enabled ? "btn-ice" : "btn-ghost-ice"}`}>{enabled ? "EDIT MODE ON — click anywhere to leave" : "Enable Edit Mode"}</button>
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        {["/","/features","/products","/pricing","/about","/contact","/faq","/security","/news","/changelog","/terms","/privacy"].map((p) => (
          <a key={p} href={p} target="_blank" rel="noopener" className="glass rounded-lg p-4 hover:border-ice border border-transparent">
            <div className="text-xs tracking-display text-muted-foreground">PREVIEW</div>
            <div className="text-sm mt-1 text-ice">{p}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function SimpleTable({ table, cols, readonly }: { table: string; cols: string[]; readonly?: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({});
  const load = () => supabase.from(table as any).select("*").limit(200).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, [table]);
  const save = async (id: string, patch: any) => { await supabase.from(table as any).update(patch).eq("id", id); load(); toast.success("Updated"); };
  const create = async () => {
    const { error } = await supabase.from(table as any).insert(draft);
    if (error) return toast.error(error.message);
    setDraft({}); load(); toast.success("Created");
  };
  const del = async (id: string) => { await supabase.from(table as any).delete().eq("id", id); load(); };
  return (
    <div className="space-y-3">
      <div className="text-xs tracking-brand text-ice">TABLE — {table}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs tracking-display text-muted-foreground">
            <tr>{cols.map((c) => <th key={c} className="text-left p-2">{c.toUpperCase()}</th>)}{!readonly && <th />}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                {cols.map((c) => (
                  <td key={c} className="p-2">
                    {readonly ? (
                      <span className="text-muted-foreground text-xs">{typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}</span>
                    ) : (
                      <input defaultValue={typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}
                        onBlur={(e) => {
                          const v = e.target.value;
                          let parsed: any = v;
                          if (typeof r[c] === "boolean") parsed = v === "true";
                          else if (typeof r[c] === "number") parsed = Number(v);
                          else if (typeof r[c] === "object" && r[c] !== null) { try { parsed = JSON.parse(v); } catch { return toast.error("Invalid JSON"); } }
                          if (parsed !== r[c]) save(r.id, { [c]: parsed });
                        }}
                        className="bg-input/40 border border-border rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-ice" />
                    )}
                  </td>
                ))}
                {!readonly && <td className="p-2"><button onClick={() => del(r.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button></td>}
              </tr>
            ))}
            {!readonly && (
              <tr className="border-t border-border">
                {cols.map((c) => (
                  <td key={c} className="p-2">
                    <input placeholder={c} value={draft[c] ?? ""} onChange={(e) => setDraft({ ...draft, [c]: e.target.value })}
                      className="bg-input/40 border border-border rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-ice" />
                  </td>
                ))}
                <td className="p-2"><button onClick={create} className="btn-ice text-xs">Add</button></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Purchases() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const load = () => supabase.from("purchase_requests").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const decide = async (id: string, status: string) => {
    const note = prompt("Admin note (optional):") ?? "";
    await supabase.from("purchase_requests").update({ status, admin_note: note }).eq("id", id);
    const row = rows.find((r) => r.id === id);
    if (row?.user_id) await supabase.from("notifications").insert({ user_id: row.user_id, message: `Purchase ${row.product_key} ${status}${note ? ` — ${note}` : ""}` });
    toast.success(status); load();
  };
  const filtered = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  return (
    <div>
      <div className="text-xs tracking-brand text-ice mb-3">PURCHASE QUEUE</div>
      <div className="flex gap-2 mb-3">{["all","pending","approved","rejected"].map((f) => (
        <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1 rounded-full border ${filter === f ? "bg-ice text-black border-ice" : "border-border text-muted-foreground"}`}>{f}</button>
      ))}</div>
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="border border-border rounded-lg p-4 flex justify-between items-start gap-4">
            <div className="text-sm">
              <div className="text-ice tracking-display text-xs">{p.product_key.toUpperCase()} · ${(p.amount_cents/100).toFixed(2)}</div>
              <div className="mt-1">{p.full_name} — {p.email} — {p.phone}</div>
              <div className="text-xs text-muted-foreground">CashApp: {p.cashapp_username} · {new Date(p.created_at).toLocaleString()}</div>
              {p.admin_note && <div className="text-xs mt-1">Note: {p.admin_note}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${p.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : p.status === "rejected" ? "bg-red-500/20 text-red-300" : "bg-ice/20 text-ice"}`}>{p.status}</span>
              {p.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => decide(p.id, "approved")} className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">Approve</button>
                  <button onClick={() => decide(p.id, "rejected")} className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Appeals() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("appeals").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const decide = async (id: string, status: string) => {
    const response = prompt("Response to user:") ?? "";
    await supabase.from("appeals").update({ status, admin_response: response }).eq("id", id);
    load(); toast.success(status);
  };
  return (
    <div>
      <div className="text-xs tracking-brand text-ice mb-3">APPEALS QUEUE</div>
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="border border-border rounded-lg p-4">
            <div className="flex justify-between"><div className="text-sm"><b>{a.reason}</b><div className="text-muted-foreground mt-1">{a.message}</div></div>
            <span className="text-xs">{a.status}</span></div>
            {a.status === "pending" && <div className="flex gap-2 mt-3">
              <button onClick={() => decide(a.id, "approved")} className="text-xs px-3 py-1 rounded bg-emerald-500/20 text-emerald-300">Approve</button>
              <button onClick={() => decide(a.id, "denied")} className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-300">Deny</button>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Users() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  return (
    <div>
      <div className="text-xs tracking-brand text-ice mb-3">USERS ({rows.length})</div>
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-xs tracking-display text-muted-foreground"><tr><th className="text-left p-2">USERNAME</th><th className="text-left p-2">JOINED</th><th className="text-left p-2">ID</th></tr></thead>
        <tbody>{rows.map((u) => (<tr key={u.id} className="border-t border-border"><td className="p-2">{u.username}</td><td className="p-2 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td><td className="p-2 text-xs text-muted-foreground">{u.id}</td></tr>))}</tbody>
      </table></div>
    </div>
  );
}

function Roles() {
  const [rows, setRows] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const load = async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("id, username"),
    ]);
    setRows(r ?? []);
    setProfiles(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.username])));
  };
  useEffect(() => { load(); }, []);
  const setRole = async (user_id: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", user_id);
    await supabase.from("user_roles").insert({ user_id, role: role as any });
    load(); toast.success("Role set");
  };
  const usersById: Record<string, string[]> = {};
  rows.forEach((r) => { (usersById[r.user_id] ??= []).push(r.role); });
  return (
    <div>
      <div className="text-xs tracking-brand text-ice mb-3">ROLE MANAGER</div>
      <div className="space-y-2">
        {Object.entries(usersById).map(([uid, roles]) => (
          <div key={uid} className="border border-border rounded p-3 flex justify-between items-center text-sm">
            <div>{profiles[uid] ?? uid.slice(0, 8)} <span className="text-muted-foreground text-xs">({roles.join(", ")})</span></div>
            <div className="flex gap-2">
              {["user","admin","banned"].map((r) => <button key={r} onClick={() => setRole(uid, r)} className="text-xs px-2 py-1 rounded border border-border hover:border-ice">{r}</button>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Notifications() {
  const [msg, setMsg] = useState("");
  const [target, setTarget] = useState("");
  const send = async () => {
    if (!msg) return;
    const payload: any = { message: msg };
    if (target) payload.user_id = target;
    const { error } = await supabase.from("notifications").insert(payload);
    if (error) return toast.error(error.message);
    setMsg(""); setTarget(""); toast.success("Sent");
  };
  return (
    <div>
      <div className="text-xs tracking-brand text-ice mb-3">NOTIFICATION BROADCASTER</div>
      <input placeholder="Target user_id (blank = everyone)" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm mb-2" />
      <textarea placeholder="Message" value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm min-h-24" />
      <button onClick={send} className="btn-ice mt-3">Broadcast</button>
    </div>
  );
}
