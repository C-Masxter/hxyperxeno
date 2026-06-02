import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { PageShell } from "@/components/Page";
import { toast } from "sonner";

export const Route = createFileRoute("/xenotext")({ component: Page });

const EMOJIS = ["😀","😂","😎","🥶","🔥","💀","👀","✅","❌","💎","⚡","🛡️","🚀","💯","❤️","🤖","👑","🎯","💬","🙏"];

type Profile = { id: string; username: string; display_name: string | null };
type DM = { id: string; sender_id: string; recipient_id: string; content: string; created_at: string; read: boolean; hidden_by_admin: boolean };

function Page() {
  const { userId, username, isAdmin, loading } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  

  // Load profiles + admin set
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name").order("username"),
        supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
      ]);
      setProfiles((p ?? []).filter((x: any) => x.id !== userId));
      setAdminIds(new Set((r ?? []).map((x: any) => x.user_id)));
    })();
  }, [userId]);

  // Load recent conversations
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("sender_id,recipient_id,created_at")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(100);
      const seen: string[] = [];
      (data ?? []).forEach((m: any) => {
        const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
        if (!seen.includes(other)) seen.push(other);
      });
      setRecents(seen);
    })();
  }, [userId, messages.length]);

  // Subscribe to new messages → update active thread (with dedupe to prevent double-send glitch)
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`dm-thread-${userId}-${active?.id ?? "none"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload: any) => {
        const m = payload.new as DM;
        if (!active) return;
        const isThread = (m.sender_id === userId && m.recipient_id === active.id) || (m.sender_id === active.id && m.recipient_id === userId);
        if (!isThread) return;
        // Dedupe — our own sends already arrive via .insert().select() return value.
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, active?.id]);

  // Load thread when active changes
  useEffect(() => {
    if (!userId || !active) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .limit(500);
      setMessages((data ?? []) as DM[]);
      // mark as read
      await supabase.from("direct_messages").update({ read: true }).eq("recipient_id", userId).eq("sender_id", active.id).eq("read", false);
    })();
  }, [userId, active?.id]);

  // Auto-scroll ONLY inside the messages container (never the whole page),
  // and only when the user is already near the bottom — so typing long
  // messages while older history is scrolled into view doesn't yank you.
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = messagesRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (nearBottom) c.scrollTop = c.scrollHeight;
  }, [messages.length]);

  // Search-only user discovery: only show users matching search query (no "browse all")
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return profiles.filter((p) => p.username.toLowerCase().includes(q) || (p.display_name || "").toLowerCase().includes(q)).slice(0, 30);
  }, [profiles, search]);

  const recentProfiles = useMemo(() => recents.map((id) => profiles.find((p) => p.id === id)).filter(Boolean) as Profile[], [recents, profiles]);

  const send = async () => {
    if (!userId || !active || !text.trim()) return;
    const content = text.trim();
    setText("");
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: DM = { id: tmpId, sender_id: userId, recipient_id: active.id, content, created_at: new Date().toISOString(), read: false, hidden_by_admin: false };
    setMessages((m) => [...m, optimistic]);
    const { error, data } = await supabase.from("direct_messages").insert({ sender_id: userId, recipient_id: active.id, content }).select().single();
    if (error) { toast.error(error.message); setMessages((m) => m.filter((x) => x.id !== tmpId)); return; }
    // Replace temp with real row (and dedupe in case realtime already added it).
    setMessages((m) => {
      const withoutTmp = m.filter((x) => x.id !== tmpId);
      if (withoutTmp.some((x) => x.id === (data as DM).id)) return withoutTmp;
      return [...withoutTmp, data as DM];
    });
  };

  const adminDelete = async (id: string) => {
    await supabase.from("direct_messages").delete().eq("id", id);
    setMessages((m) => m.filter((x) => x.id !== id));
  };
  const adminHide = async (id: string) => {
    await supabase.from("direct_messages").update({ hidden_by_admin: true }).eq("id", id);
    setMessages((m) => m.map((x) => x.id === id ? { ...x, hidden_by_admin: true } : x));
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!userId) return (
    <div className="p-12 text-center">
      <div className="text-xl">Sign in to use XenoText</div>
      <Link to="/login" className="btn-ice mt-6 inline-flex">Sign in</Link>
    </div>
  );

  return (
    <PageShell>
      <div className="mb-6">
        <div className="text-xs tracking-brand text-ice">XENOTEXT</div>
        <h1 className="text-3xl font-light mt-1">Direct Messages</h1>
        <div className="text-xs text-muted-foreground mt-1">Signed in as {username}{isAdmin && <span className="text-ice"> · ADMIN</span>}</div>
      </div>
      <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[70vh]">
        <aside className="glass rounded-xl p-3 flex flex-col">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…"
            className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <div className="mt-3 overflow-y-auto max-h-[65vh] space-y-1">
            {!search && recentProfiles.length > 0 && (
              <>
                <div className="text-[10px] tracking-brand text-ice/70 px-2 pt-1">RECENT</div>
                {recentProfiles.map((p) => <UserRow key={`r-${p.id}`} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)} onClick={() => setActive(p)} />)}
              </>
            )}
            {!search && recentProfiles.length === 0 && (
              <div className="text-xs text-muted-foreground p-3">Search for a user above to start a conversation.</div>
            )}
            {search && (
              <>
                <div className="text-[10px] tracking-brand text-ice/70 px-2 pt-1">SEARCH RESULTS</div>
                {filtered.map((p) => <UserRow key={p.id} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)} onClick={() => setActive(p)} />)}
                {filtered.length === 0 && <div className="text-xs text-muted-foreground p-3">No users match "{search}".</div>}
              </>
            )}
          </div>
        </aside>

        <section className="glass-strong rounded-xl flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a user to start messaging</div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">{active.display_name || active.username}</div>
                  <div className="text-xs text-muted-foreground">@{active.username}{adminIds.has(active.id) && <span className="text-ice"> · ADMIN</span>}</div>
                </div>
                {isAdmin && <span className="text-[10px] tracking-brand text-ice px-2 py-1 rounded bg-ice/10">ADMIN VIEW</span>}
              </div>
              <div ref={messagesRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-ice text-black" : "bg-white/10 text-foreground"} ${m.hidden_by_admin ? "opacity-40 italic" : ""}`}>
                        {m.content}
                        <div className={`text-[10px] mt-1 ${mine ? "text-black/60" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{mine && (m.read ? " · seen" : " · sent")}</div>
                      </div>
                      {isAdmin && !String(m.id).startsWith("tmp-") && (
                        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 ml-2 self-center">
                          <button onClick={() => adminHide(m.id)} title="Hide" className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20">hide</button>
                          <button onClick={() => adminDelete(m.id)} title="Delete" className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">del</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="text-center text-xs text-muted-foreground mt-8">No messages yet — say hi.</div>}
                
              </div>
              <div className="border-t border-border p-3">
                {showEmoji && (
                  <div className="mb-2 glass rounded-lg p-2 flex flex-wrap gap-1">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" onClick={() => setText((t) => t + e)} className="text-xl hover:scale-125 transition px-1">{e}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowEmoji((s) => !s)} className="px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-lg">😊</button>
                  <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Message ${active.display_name || active.username}…`}
                    className="flex-1 bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice" />
                  <button onClick={send} className="btn-ice">Send</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function UserRow({ p, active, isAdmin, onClick }: { p: Profile; active: boolean; isAdmin: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded text-sm transition flex items-center justify-between ${active ? "bg-ice/15 text-ice" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
      <span className="truncate">{p.display_name || p.username}</span>
      {isAdmin && <span className="text-[9px] tracking-brand text-ice ml-2">ADMIN</span>}
    </button>
  );
}
