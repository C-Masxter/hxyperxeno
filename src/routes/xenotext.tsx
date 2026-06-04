import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { PageShell } from "@/components/Page";
import { toast } from "sonner";

export const Route = createFileRoute("/xenotext")({ component: Page });

const EMOJIS = ["😀","😂","😎","🥶","🔥","💀","👀","✅","❌","💎","⚡","🛡️","🚀","💯","❤️","🤖","👑","🎯","💬","🙏"];
const REACTIONS = ["🔥","😂","💀","💔","❤️","👀"];
const EDIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const SCROLL_STICK_PX = 120; // if user is within this distance from bottom, auto-scroll

type Profile = { id: string; username: string; display_name: string | null };
type DM = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
  hidden_by_admin: boolean;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  delivered_at: string | null;
};
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

function Page() {
  const { userId, username, isAdmin, loading } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [pins, setPins] = useState<Map<string, { priority: boolean }>>(new Map());
  const [presence, setPresence] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const [editing, setEditing] = useState<DM | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [reactPickerFor, setReactPickerFor] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef(true);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSentRef = useRef(0);
  const peerTypingTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Load profiles, admins, pins ---
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: p }, { data: r }, { data: pn }] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name").order("username"),
        supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
        supabase.from("dm_pins").select("peer_id,priority").eq("user_id", userId),
      ]);
      setProfiles((p ?? []).filter((x: any) => x.id !== userId));
      setAdminIds(new Set((r ?? []).map((x: any) => x.user_id)));
      setPins(new Map((pn ?? []).map((x: any) => [x.peer_id, { priority: !!x.priority }])));
    })();
  }, [userId]);

  // --- Recent conversations ---
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

  // --- Presence (global "online users") ---
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("xenotext-presence", { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setPresence(new Set(Object.keys(state)));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // --- Load thread when active changes ---
  useEffect(() => {
    if (!userId || !active) { setMessages([]); setReactions([]); return; }
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${userId})`)
        .order("created_at", { ascending: true })
        .limit(500);
      const msgs = (data ?? []) as DM[];
      setMessages(msgs);
      // load reactions for these messages
      if (msgs.length) {
        const { data: rx } = await supabase.from("message_reactions").select("*").in("message_id", msgs.map((m) => m.id));
        setReactions((rx ?? []) as Reaction[]);
      } else {
        setReactions([]);
      }
      // mark delivered + read
      const incoming = msgs.filter((m) => m.recipient_id === userId);
      const undelivered = incoming.filter((m) => !m.delivered_at).map((m) => m.id);
      if (undelivered.length) await supabase.from("direct_messages").update({ delivered_at: new Date().toISOString() }).in("id", undelivered);
      await supabase.from("direct_messages").update({ read: true }).eq("recipient_id", userId).eq("sender_id", active.id).eq("read", false);
      stickyRef.current = true;
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "auto" }));
    })();
  }, [userId, active?.id]);

  // --- Realtime: messages + reactions + typing for active thread ---
  useEffect(() => {
    if (!userId || !active) return;
    const ch = supabase.channel(`dm-thread-${userId}-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, async (payload: any) => {
        const m = payload.new as DM;
        const isThread = (m.sender_id === userId && m.recipient_id === active.id) || (m.sender_id === active.id && m.recipient_id === userId);
        if (!isThread) return;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        setNewIds((s) => { const n = new Set(s); n.add(m.id); return n; });
        setTimeout(() => setNewIds((s) => { const n = new Set(s); n.delete(m.id); return n; }), 1800);
        if (m.recipient_id === userId) {
          await supabase.from("direct_messages").update({ delivered_at: new Date().toISOString(), read: true }).eq("id", m.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload: any) => {
        const m = payload.new as DM;
        setMessages((prev) => prev.map((x) => x.id === m.id ? m : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "direct_messages" }, (payload: any) => {
        const m = payload.old as DM;
        setMessages((prev) => prev.filter((x) => x.id !== m.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload: any) => {
        if (payload.eventType === "INSERT") setReactions((r) => r.some((x) => x.id === payload.new.id) ? r : [...r, payload.new as Reaction]);
        else if (payload.eventType === "DELETE") setReactions((r) => r.filter((x) => x.id !== (payload.old as Reaction).id));
      })
      .on("broadcast", { event: "typing" }, (p: any) => {
        if (p.payload?.from !== active.id) return;
        setPeerTyping(true);
        if (peerTypingTimerRef.current) window.clearTimeout(peerTypingTimerRef.current);
        peerTypingTimerRef.current = window.setTimeout(() => setPeerTyping(false), 2500);
      })
      .subscribe();
    typingChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
      setPeerTyping(false);
    };
  }, [userId, active?.id]);

  // --- Track scroll position; only auto-stick when near bottom ---
  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickyRef.current = distFromBottom < SCROLL_STICK_PX;
  };

  // --- Auto-scroll: ONLY when user is already at bottom. Fixes the "scrolls down while reading" bug. ---
  useEffect(() => {
    if (!stickyRef.current) return;
    const last = messages[messages.length - 1];
    // also force-scroll if the latest message is mine
    if (last && last.sender_id !== userId && !stickyRef.current) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peerTyping]);

  // --- User discovery ---
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return profiles.filter((p) => p.username.toLowerCase().includes(q) || (p.display_name || "").toLowerCase().includes(q)).slice(0, 30);
  }, [profiles, search]);

  const recentProfiles = useMemo(() => recents.map((id) => profiles.find((p) => p.id === id)).filter(Boolean) as Profile[], [recents, profiles]);

  // Sort: priority pins → pinned → online → rest
  const sortedRecent = useMemo(() => {
    const score = (p: Profile) => {
      const pin = pins.get(p.id);
      return (pin?.priority ? 1000 : 0) + (pin ? 100 : 0) + (presence.has(p.id) ? 10 : 0) + (adminIds.has(p.id) ? 1 : 0);
    };
    return [...recentProfiles].sort((a, b) => score(b) - score(a));
  }, [recentProfiles, pins, presence, adminIds]);

  // --- Send / edit ---
  const broadcastTyping = useCallback(() => {
    const ch = typingChannelRef.current; if (!ch || !userId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    ch.send({ type: "broadcast", event: "typing", payload: { from: userId } });
  }, [userId]);

  const send = async () => {
    if (!userId || !active || !text.trim()) return;
    const content = text.trim();
    setText("");

    if (editing) {
      const { error } = await supabase
        .from("direct_messages")
        .update({ content, edited_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      setEditing(null);
      return;
    }

    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: DM = {
      id: tmpId, sender_id: userId, recipient_id: active.id, content,
      created_at: new Date().toISOString(), read: false, hidden_by_admin: false,
      reply_to_id: replyTo?.id ?? null, edited_at: null, deleted_at: null, delivered_at: null,
    };
    setMessages((m) => [...m, optimistic]);
    stickyRef.current = true; // sending always sticks
    const { error, data } = await supabase.from("direct_messages")
      .insert({ sender_id: userId, recipient_id: active.id, content, reply_to_id: replyTo?.id ?? null })
      .select().single();
    setReplyTo(null);
    if (error) { toast.error(error.message); setMessages((m) => m.filter((x) => x.id !== tmpId)); return; }
    setMessages((m) => {
      const withoutTmp = m.filter((x) => x.id !== tmpId);
      if (withoutTmp.some((x) => x.id === (data as DM).id)) return withoutTmp;
      return [...withoutTmp, data as DM];
    });
  };

  const unsend = async (m: DM) => {
    if (m.sender_id !== userId) return;
    await supabase.from("direct_messages").delete().eq("id", m.id);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
  };

  const startEdit = (m: DM) => {
    if (m.sender_id !== userId) return;
    if (Date.now() - new Date(m.created_at).getTime() > EDIT_WINDOW_MS) { toast.error("Edit window expired (2 min)"); return; }
    setEditing(m); setReplyTo(null); setText(m.content); inputRef.current?.focus();
  };

  const toggleReaction = async (m: DM, emoji: string) => {
    if (!userId) return;
    const mine = reactions.find((r) => r.message_id === m.id && r.user_id === userId && r.emoji === emoji);
    if (mine) {
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: m.id, user_id: userId, emoji });
    }
    setReactPickerFor(null);
  };

  const togglePin = async (peerId: string, priority = false) => {
    if (!userId) return;
    const existing = pins.get(peerId);
    if (existing && existing.priority === priority) {
      await supabase.from("dm_pins").delete().eq("user_id", userId).eq("peer_id", peerId);
      setPins((m) => { const n = new Map(m); n.delete(peerId); return n; });
    } else {
      await supabase.from("dm_pins").upsert({ user_id: userId, peer_id: peerId, priority }, { onConflict: "user_id,peer_id" });
      setPins((m) => { const n = new Map(m); n.set(peerId, { priority }); return n; });
    }
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

  const reactionsByMsg = (id: string) => {
    const map = new Map<string, { count: number; mine: boolean }>();
    reactions.filter((r) => r.message_id === id).forEach((r) => {
      const cur = map.get(r.emoji) || { count: 0, mine: false };
      cur.count++; if (r.user_id === userId) cur.mine = true;
      map.set(r.emoji, cur);
    });
    return Array.from(map.entries());
  };

  const statusFor = (m: DM): string => {
    if (m.sender_id !== userId) return "";
    if (String(m.id).startsWith("tmp-")) return "sending…";
    if (m.read) return "seen";
    if (m.delivered_at) return "delivered";
    return "sent";
  };

  return (
    <PageShell>
      <style>{`
        @keyframes signal-in { 0%{opacity:0; transform:translateY(8px) scale(.96); box-shadow:0 0 0 0 oklch(0.82 0.13 230 / .8);} 60%{box-shadow:0 0 24px 4px oklch(0.82 0.13 230 / .35);} 100%{opacity:1; transform:translateY(0) scale(1); box-shadow:0 0 0 0 transparent;} }
        .signal-in { animation: signal-in .9s cubic-bezier(.2,.8,.2,1); }
        @keyframes glow-pulse { 0%,100%{ box-shadow:0 0 0 1px oklch(0.82 0.13 230 / .25);} 50%{ box-shadow:0 0 18px 2px oklch(0.82 0.13 230 / .55);} }
        .signal-glow { animation: glow-pulse 1.6s ease-in-out infinite; }
        @keyframes type-bounce { 0%,80%,100%{ transform:translateY(0); opacity:.4;} 40%{ transform:translateY(-4px); opacity:1;} }
        .typing-dot { display:inline-block; width:6px; height:6px; border-radius:50%; background: var(--ice); margin:0 2px; animation: type-bounce 1.2s infinite; }
        .typing-dot:nth-child(2){ animation-delay:.15s; } .typing-dot:nth-child(3){ animation-delay:.3s; }
      `}</style>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-xs tracking-brand text-ice">XENOTEXT INBOX</div>
          <h1 className="text-3xl font-light mt-1">Threads</h1>
          <div className="text-xs text-muted-foreground mt-1">
            Signed in as {username}{isAdmin && <span className="text-ice"> · ADMIN</span>}
            <span className="ml-3"><span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1.5 align-middle" />{presence.size} online</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-4 min-h-[70vh]">
        <aside className="glass rounded-xl p-3 flex flex-col">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…"
            className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <div className="mt-3 overflow-y-auto max-h-[65vh] space-y-1">
            {!search && sortedRecent.length > 0 && (
              <>
                <div className="text-[10px] tracking-brand text-ice/70 px-2 pt-1">THREADS</div>
                {sortedRecent.map((p) => (
                  <UserRow key={`r-${p.id}`} p={p} active={active?.id === p.id}
                    isAdmin={adminIds.has(p.id)} online={presence.has(p.id)}
                    pinned={pins.has(p.id)} priority={!!pins.get(p.id)?.priority}
                    onClick={() => setActive(p)} onPin={() => togglePin(p.id, false)} onStar={() => togglePin(p.id, true)} />
                ))}
              </>
            )}
            {!search && sortedRecent.length === 0 && (
              <div className="text-xs text-muted-foreground p-3">Search for a user above to start a thread.</div>
            )}
            {search && (
              <>
                <div className="text-[10px] tracking-brand text-ice/70 px-2 pt-1">SEARCH RESULTS</div>
                {filtered.map((p) => (
                  <UserRow key={p.id} p={p} active={active?.id === p.id}
                    isAdmin={adminIds.has(p.id)} online={presence.has(p.id)}
                    pinned={pins.has(p.id)} priority={!!pins.get(p.id)?.priority}
                    onClick={() => setActive(p)} onPin={() => togglePin(p.id, false)} onStar={() => togglePin(p.id, true)} />
                ))}
                {filtered.length === 0 && <div className="text-xs text-muted-foreground p-3">No users match "{search}".</div>}
              </>
            )}
          </div>
        </aside>

        <section className="glass-strong rounded-xl flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a thread to start messaging</div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm flex items-center gap-2">
                    {active.display_name || active.username}
                    {presence.has(active.id) ? <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="Online" /> : <span className="inline-block w-2 h-2 rounded-full bg-white/20" title="Offline" />}
                  </div>
                  <div className="text-xs text-muted-foreground">@{active.username}{adminIds.has(active.id) && <span className="text-ice"> · ADMIN</span>}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePin(active.id, false)} title={pins.has(active.id) ? "Unpin thread" : "Pin thread"}
                    className={`text-[10px] tracking-brand px-2 py-1 rounded ${pins.has(active.id) ? "bg-ice/20 text-ice" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>📌 {pins.has(active.id) ? "PINNED" : "PIN"}</button>
                  <button onClick={() => togglePin(active.id, true)} title="Priority"
                    className={`text-[10px] tracking-brand px-2 py-1 rounded ${pins.get(active.id)?.priority ? "bg-yellow-400/20 text-yellow-300" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}>⭐ PRIORITY</button>
                  {isAdmin && <span className="text-[10px] tracking-brand text-ice px-2 py-1 rounded bg-ice/10">ADMIN VIEW</span>}
                </div>
              </div>

              <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  const replyMsg = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
                  const rx = reactionsByMsg(m.id);
                  const isNew = newIds.has(m.id);
                  const canEdit = mine && !String(m.id).startsWith("tmp-") && (Date.now() - new Date(m.created_at).getTime() < EDIT_WINDOW_MS);
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group`}>
                      <div className={`relative max-w-[75%] ${isNew ? "signal-in" : ""}`}>
                        {replyMsg && (
                          <div className={`text-[10px] mb-1 px-2 py-1 rounded border-l-2 ${mine ? "border-ice/60 bg-white/5 text-right" : "border-ice/60 bg-white/5"}`}>
                            <span className="text-ice/80">↪ </span>
                            <span className="text-muted-foreground italic">{replyMsg.content.slice(0, 80)}</span>
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-2 text-sm relative ${mine ? "bg-ice text-black" : "bg-white/10 text-foreground"} ${m.hidden_by_admin ? "opacity-40 italic" : ""} ${isNew && !mine ? "signal-glow" : ""}`}>
                          {m.content}
                          {m.edited_at && <span className={`ml-1 text-[9px] ${mine ? "text-black/50" : "text-muted-foreground"}`}>(edited)</span>}
                          <div className={`text-[10px] mt-1 flex items-center gap-2 ${mine ? "text-black/60 justify-end" : "text-muted-foreground"}`}>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {mine && <span>· {statusFor(m)}</span>}
                          </div>
                        </div>
                        {rx.length > 0 && (
                          <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                            {rx.map(([emoji, info]) => (
                              <button key={emoji} onClick={() => toggleReaction(m, emoji)}
                                className={`text-[11px] px-1.5 py-0.5 rounded-full border transition ${info.mine ? "bg-ice/20 border-ice/60 text-ice" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                                {emoji} {info.count}
                              </button>
                            ))}
                          </div>
                        )}
                        {reactPickerFor === m.id && (
                          <div className={`absolute z-10 ${mine ? "right-0" : "left-0"} -top-10 glass rounded-full px-2 py-1 flex gap-1 shadow-lg`}>
                            {REACTIONS.map((e) => (
                              <button key={e} onClick={() => toggleReaction(m, e)} className="text-lg hover:scale-125 transition px-1">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* hover actions */}
                      <div className={`opacity-0 group-hover:opacity-100 transition flex gap-1 ${mine ? "mr-2 order-first" : "ml-2"} self-center`}>
                        <button onClick={() => setReactPickerFor((c) => c === m.id ? null : m.id)} title="React" className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15">🙂</button>
                        <button onClick={() => { setReplyTo(m); setEditing(null); inputRef.current?.focus(); }} title="Reply" className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15">↪</button>
                        {canEdit && <button onClick={() => startEdit(m)} title="Edit (2 min)" className="text-[11px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15">✎</button>}
                        {mine && !String(m.id).startsWith("tmp-") && <button onClick={() => unsend(m)} title="Unsend" className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">⌫</button>}
                        {isAdmin && !mine && !String(m.id).startsWith("tmp-") && (
                          <>
                            <button onClick={() => adminHide(m.id)} title="Hide" className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20">hide</button>
                            <button onClick={() => adminDelete(m.id)} title="Delete" className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">del</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="text-center text-xs text-muted-foreground mt-8">No signals yet — say hi.</div>}
                {peerTyping && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 pl-2">
                    <span className="text-ice">{active.display_name || active.username}</span> is transmitting
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-border p-3">
                {(replyTo || editing) && (
                  <div className="mb-2 flex items-center justify-between text-xs px-3 py-2 rounded bg-white/5 border-l-2 border-ice">
                    <div className="truncate">
                      <span className="text-ice tracking-brand text-[10px] mr-2">{editing ? "EDITING" : "REPLYING TO"}</span>
                      <span className="text-muted-foreground italic">{(editing ?? replyTo)!.content.slice(0, 100)}</span>
                    </div>
                    <button onClick={() => { setReplyTo(null); setEditing(null); setText(""); }} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
                  </div>
                )}
                {showEmoji && (
                  <div className="mb-2 glass rounded-lg p-2 flex flex-wrap gap-1">
                    {EMOJIS.map((e) => (
                      <button key={e} type="button" onClick={() => setText((t) => t + e)} className="text-xl hover:scale-125 transition px-1">{e}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowEmoji((s) => !s)} className="px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-lg">😊</button>
                  <input ref={inputRef} value={text}
                    onChange={(e) => { setText(e.target.value); broadcastTyping(); }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === "Escape") { setReplyTo(null); setEditing(null); setText(""); } }}
                    placeholder={editing ? "Edit signal…" : `Message ${active.display_name || active.username}…`}
                    className="flex-1 bg-input/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ice" />
                  <button onClick={send} className="btn-ice">{editing ? "Save" : "Send"}</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </PageShell>
  );
}

function UserRow({ p, active, isAdmin, online, pinned, priority, onClick, onPin, onStar }: {
  p: Profile; active: boolean; isAdmin: boolean; online: boolean; pinned: boolean; priority: boolean;
  onClick: () => void; onPin: () => void; onStar: () => void;
}) {
  return (
    <div className={`group flex items-center rounded text-sm transition ${active ? "bg-ice/15 text-ice" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
      <button onClick={onClick} className="flex-1 text-left px-3 py-2 flex items-center gap-2 min-w-0">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${online ? "bg-green-400" : "bg-white/20"}`} />
        <span className="truncate">{p.display_name || p.username}</span>
        {priority && <span className="text-[10px] text-yellow-300">⭐</span>}
        {pinned && !priority && <span className="text-[10px] text-ice">📌</span>}
        {isAdmin && <span className="text-[9px] tracking-brand text-ice ml-auto">ADMIN</span>}
      </button>
      <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 pr-2">
        <button onClick={(e) => { e.stopPropagation(); onStar(); }} title="Priority" className="text-xs hover:text-yellow-300">⭐</button>
        <button onClick={(e) => { e.stopPropagation(); onPin(); }} title="Pin" className="text-xs hover:text-ice">📌</button>
      </div>
    </div>
  );
}
