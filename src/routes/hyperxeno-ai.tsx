import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { IntroLoader } from "@/components/Effects";
import { toast } from "sonner";

export const Route = createFileRoute("/hyperxeno-ai")({ component: Page });

type Msg = { role: "user" | "assistant"; content: string; mode?: string; cost?: number };
type Conv = { id: string; title: string; updated_at: string };

const TIERS = [
  { key: "basic", name: "Xeno AI Basic", price: 20, daily: 50, color: "text-ice", desc: "50 credits / day" },
  { key: "pro", name: "Xeno AI Pro", price: 40, daily: 200, color: "text-chrome", desc: "200 credits / day" },
  { key: "entrepreneur", name: "Xeno AI Entrepreneur", price: 60, daily: 1000, color: "text-amber-300", desc: "1000 credits / day · priority" },
];

function Page() {
  const { userId, username, loading } = useSession();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [credits, setCredits] = useState<{ balance: number; daily_allowance: number; tier: string } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refreshCredits = async () => {
    if (!userId) return;
    const { data } = await supabase.from("ai_credits").select("balance,daily_allowance,tier").eq("user_id", userId).maybeSingle();
    if (data) setCredits({ balance: Number(data.balance), daily_allowance: Number(data.daily_allowance), tier: data.tier });
  };
  const loadConversations = async () => {
    if (!userId) return;
    const { data } = await supabase.from("ai_conversations").select("id,title,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(30);
    setConversations(data ?? []);
  };
  const loadConv = async (id: string) => {
    setConvId(id);
    const { data } = await supabase.from("ai_messages").select("role,content,mode,cost").eq("conversation_id", id).order("created_at");
    setMessages((data ?? []).map((m: any) => ({ role: m.role, content: m.content, mode: m.mode, cost: Number(m.cost) })));
  };
  const newChat = () => { setConvId(null); setMessages([]); };

  useEffect(() => { if (userId) { refreshCredits(); loadConversations(); } }, [userId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, busy]);

  const send = async () => {
    if (!input.trim() || busy || !userId) return;
    const text = input.trim();
    setInput("");
    const next = [...messages, { role: "user", content: text } as Msg];
    setMessages(next);
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/hyperxeno-ai", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ message: text, conversation_id: convId, history: messages }),
      });
      const json = await res.json();
      if (!res.ok && !json.content) throw new Error(json.error || "AI error");
      setMessages([...next, { role: "assistant", content: json.content, mode: json.mode, cost: json.cost }]);
      if (json.conversation_id && !convId) { setConvId(json.conversation_id); loadConversations(); }
      if (typeof json.balance === "number") setCredits((c) => c ? { ...c, balance: json.balance } : c);
      if (json.insufficient) setShowUpgrade(true);
    } catch (e: any) {
      toast.error(e.message);
      setMessages([...next, { role: "assistant", content: `⚠️ ${e.message}`, mode: "error" }]);
    } finally { setBusy(false); refreshCredits(); }
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!userId) return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="glass-strong rounded-2xl max-w-md w-full p-10 text-center">
        <div className="text-xs tracking-brand text-ice mb-2">🔐 SECURE ACCESS REQUIRED</div>
        <h1 className="text-3xl font-light">HyperXeno AI</h1>
        <p className="text-sm text-muted-foreground mt-3">Authentication is required to access the AI operating system. No anonymous sessions.</p>
        <Link to="/login" className="btn-ice mt-6 inline-flex">Sign in</Link>
      </div>
    </div>
  );

  return (
    <>
      <IntroLoader duration={2200} label="BOOTING HYPERXENO AI" forceKey="hxai" />
      <div className="px-4 md:px-6 pt-6 pb-8" data-no-edit>
        <div className="mx-auto max-w-7xl grid lg:grid-cols-[260px_1fr] gap-4">
          <aside className="glass rounded-xl p-3 h-fit lg:sticky lg:top-20 space-y-3">
            <button onClick={newChat} className="btn-ice w-full text-sm">+ New chat</button>
            <div className="border-t border-border pt-3">
              <div className="text-[10px] tracking-brand text-ice/70 px-2 pb-1">CREDITS</div>
              <div className="px-2">
                <div className="text-2xl font-light text-chrome">{credits ? credits.balance.toFixed(1) : "…"}</div>
                <div className="text-[10px] text-muted-foreground tracking-display">/ {credits?.daily_allowance ?? 10} daily · tier: {credits?.tier ?? "free"}</div>
                <div className="mt-1 h-1 bg-border rounded overflow-hidden"><div className="h-full bg-gradient-to-r from-ice to-chrome" style={{ width: `${Math.min(100, ((credits?.balance ?? 0) / (credits?.daily_allowance || 10)) * 100)}%` }} /></div>
                <button onClick={() => setShowUpgrade(true)} className="mt-2 text-[10px] text-ice hover:underline">Upgrade tier →</button>
              </div>
            </div>
            <div className="border-t border-border pt-3 max-h-[55vh] overflow-y-auto">
              <div className="text-[10px] tracking-brand text-ice/70 px-2 pb-1">CONVERSATIONS</div>
              {conversations.length === 0 && <div className="text-xs text-muted-foreground px-2">No history yet</div>}
              {conversations.map((c) => (
                <button key={c.id} onClick={() => loadConv(c.id)} className={`w-full text-left px-2 py-1.5 rounded text-xs truncate ${convId === c.id ? "bg-ice/15 text-ice" : "text-muted-foreground hover:bg-white/5"}`}>{c.title || "Untitled"}</button>
              ))}
            </div>
          </aside>

          <section className="glass-strong rounded-xl flex flex-col min-h-[80vh] max-h-[calc(100vh-7rem)]">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-xs tracking-brand text-ice">HYPERXENO AI · v1</div>
                <div className="text-[11px] text-muted-foreground tracking-display">Adaptive intelligence engine · auto-mode · multi-agent</div>
              </div>
              <div className="text-[10px] text-muted-foreground">● ONLINE · {username}</div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-5">
              {messages.length === 0 && (
                <div className="text-center max-w-xl mx-auto pt-10">
                  <div className="text-4xl md:text-5xl font-light tracking-brand">
                    <span className="text-chrome">HYPER</span> <span className="text-ice">XENO</span> <span className="text-muted-foreground">AI</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">An AI operating system. Ask anything — code, design, build full apps, generate concepts.</p>
                  <div className="grid sm:grid-cols-2 gap-2 mt-6 text-left">
                    {[
                      "Build a landing page for a SaaS analytics tool",
                      "Explain quantum-resistant encryption",
                      "Generate a full React + Vite todo app",
                      "Review this snippet for bugs: ...",
                    ].map((s) => (
                      <button key={s} onClick={() => setInput(s)} className="glass rounded-lg p-3 text-xs text-left hover:border-ice border border-transparent transition">{s}</button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => <MessageView key={i} m={m} />)}
              {busy && <div className="flex gap-2 items-center text-xs text-ice"><Spinner /> HyperXeno AI is reasoning…</div>}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Ask HyperXeno AI to build, code, design, or explain anything…"
                  className="flex-1 bg-input/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ice resize-none min-h-[44px] max-h-40"
                  rows={1}
                />
                <button disabled={busy || !input.trim()} onClick={send} className="btn-ice text-sm h-[44px] px-5">Send</button>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5 px-1">Lite · 0.1 cr  ·  Pro (code) · 1 cr  ·  Heavy (build) · 3 cr</div>
            </div>
          </section>
        </div>
      </div>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} userId={userId} />}
    </>
  );
}

function Spinner() {
  return <span className="inline-block w-3 h-3 border-2 border-ice/40 border-t-ice rounded-full animate-spin" />;
}

// Render assistant message: split fenced code blocks and render previews for HTML
function MessageView({ m }: { m: Msg }) {
  const isUser = m.role === "user";
  const blocks = useMemo(() => parseBlocks(m.content), [m.content]);
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] rounded-xl px-4 py-3 ${isUser ? "bg-ice/10 border border-ice/20" : "bg-white/5 border border-border"}`}>
        {!isUser && m.mode && (
          <div className="text-[10px] tracking-display text-ice/70 mb-1">MODE: {m.mode.toUpperCase()}{m.cost ? ` · ${m.cost} cr` : ""}</div>
        )}
        <div className="text-sm leading-relaxed space-y-3">
          {blocks.map((b, i) => b.type === "code" ? (
            <CodeBlock key={i} lang={b.lang} filename={b.filename} code={b.code} />
          ) : (
            <Markdown key={i} text={b.text} />
          ))}
        </div>
      </div>
    </div>
  );
}

type Block = { type: "text"; text: string } | { type: "code"; lang: string; filename?: string; code: string };
function parseBlocks(content: string): Block[] {
  const out: Block[] = [];
  const re = /```([a-zA-Z0-9+\-]*)(?:\s+filename=([^\s`\n]+))?\n([\s\S]*?)```/g;
  let last = 0; let m;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) out.push({ type: "text", text: content.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "text", filename: m[2], code: m[3] });
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push({ type: "text", text: content.slice(last) });
  return out;
}

function Markdown({ text }: { text: string }) {
  // lightweight: bold, headers, line breaks, inline code, links
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<div class="text-base font-medium text-ice mt-2">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-lg font-medium text-chrome mt-3">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="text-xl font-light text-ice mt-3">$1</div>')
    .replace(/\*\*([^*]+)\*\*/g, '<b class="text-foreground">$1</b>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded text-ice text-xs">$1</code>')
    .replace(/^\s*[-*] (.+)$/gm, '<div class="pl-4">• $1</div>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br/>');
  return <div className="prose-sm" dangerouslySetInnerHTML={{ __html: html }} />;
}

function CodeBlock({ lang, filename, code }: { lang: string; filename?: string; code: string }) {
  const [tab, setTab] = useState<"code" | "preview">("code");
  const isHtml = /^html?$/i.test(lang) || /<\s*html[\s>]/i.test(code) || /<!doctype/i.test(code);
  const previewSrc = useMemo(() => {
    if (!isHtml) return "";
    const watermark = `<div style="position:fixed;bottom:8px;right:10px;font:10px/1.2 system-ui;color:#7dd3fc;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:6px;z-index:99999;backdrop-filter:blur(4px);border:1px solid rgba(125,211,252,.3);">⚡ Built with Xeno AI</div>`;
    if (/<\/body>/i.test(code)) return code.replace(/<\/body>/i, watermark + "</body>");
    return code + watermark;
  }, [code, isHtml]);
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-black/50">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/40 border-b border-border">
        <div className="text-[10px] tracking-display text-ice">
          {filename ? <span className="text-chrome">{filename}</span> : <span>{lang || "code"}</span>}
        </div>
        <div className="flex gap-1">
          {isHtml && (
            <>
              <button onClick={() => setTab("code")} className={`text-[10px] px-2 py-0.5 rounded ${tab === "code" ? "bg-ice text-black" : "text-muted-foreground hover:text-ice"}`}>Code</button>
              <button onClick={() => setTab("preview")} className={`text-[10px] px-2 py-0.5 rounded ${tab === "preview" ? "bg-ice text-black" : "text-muted-foreground hover:text-ice"}`}>👁 Preview</button>
            </>
          )}
          <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }} className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-ice">Copy</button>
        </div>
      </div>
      {tab === "preview" && isHtml ? (
        <iframe sandbox="allow-scripts" srcDoc={previewSrc} className="w-full h-[420px] bg-white" title="preview" />
      ) : (
        <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto max-h-[500px] text-foreground/90"><code>{code}</code></pre>
      )}
    </div>
  );
}

function UpgradeModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [tier, setTier] = useState(TIERS[0]);
  const [form, setForm] = useState({ full_name: "", email: "", cashapp_username: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    let ip = ""; try { ip = (await fetch("https://api.ipify.org?format=json").then(r => r.json())).ip ?? ""; } catch {}
    const ua = navigator.userAgent;
    const device = `${navigator.platform || "?"} · ${navigator.language} · ${window.screen.width}x${window.screen.height}`;
    const { error } = await supabase.from("ai_upgrade_requests").insert({
      user_id: userId, tier: tier.key, amount_cents: tier.price * 100,
      cashapp_username: form.cashapp_username, full_name: form.full_name, email: form.email,
      ip_address: ip, user_agent: ua, device_info: device,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Upgrade request submitted — admin will verify your CashApp payment");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="glass-strong rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs tracking-brand text-ice mb-1">UPGRADE · HYPERXENO AI</div>
        <h2 className="text-2xl font-light">Unlock more credits</h2>
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          {TIERS.map((t) => (
            <button key={t.key} onClick={() => setTier(t)} className={`text-left rounded-xl p-4 border transition ${tier.key === t.key ? "border-ice bg-ice/10" : "border-border hover:border-ice/50"}`}>
              <div className={`text-xs tracking-display ${t.color}`}>{t.name.toUpperCase()}</div>
              <div className="text-3xl font-light mt-2">${t.price}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-ice/30 bg-ice/5 p-4">
          <div className="text-xs tracking-display text-ice">PAYMENT INSTRUCTION</div>
          <div className="mt-2 text-sm">Send <span className="text-chrome font-medium">${tier.price}.00</span> via CashApp to <span className="text-ice font-medium">$CMasxter</span></div>
          <div className="text-xs text-muted-foreground mt-1">Admin verifies manually, then your AI tier upgrades.</div>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-2">
          <input required placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <input required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <input required placeholder="Your CashApp username (e.g. $you)" value={form.cashapp_username} onChange={(e) => setForm({ ...form, cashapp_username: e.target.value })} className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost-ice flex-1">Cancel</button>
            <button disabled={busy} className="btn-ice flex-1">{busy ? "Submitting…" : `Request ${tier.name}`}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
