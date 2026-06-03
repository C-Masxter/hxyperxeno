import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { PageShell } from "@/components/Page";
import { toast } from "sonner";

export const Route = createFileRoute("/xenotext")({ component: Page });

const EMOJIS = ["😀","😂","😎","🥶","🔥","💀","👀","✅","❌","💎","⚡","🛡️","🚀","💯","❤️","🤖","👑","🎯","💬","🙏"];
const REACTIONS = ["🔥","😂","💀","❤️","💔","👍","👎","👀"];
const EDIT_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

type Profile = { id: string; username: string; display_name: string | null };
type DM = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
  hidden_by_admin: boolean;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  delivered_at?: string | null;
};
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type Pin = { peer_id: string; priority: boolean };
type PresenceStatus = "online" | "idle" | "invisible";

function Page() {
  const { userId, username, isAdmin, loading } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [friends, setFriends] = useState<Map<string, boolean>>(new Map()); // peer -> trusted
  const [pins, setPins] = useState<Map<string, boolean>>(new Map()); // peer -> priority
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [unread, setUnread] = useState<Map<string, number>>(new Map());
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const [editing, setEditing] = useState<DM | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [myStatus, setMyStatus] = useState<PresenceStatus>("online");
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());
  const [, force] = useState(0);

  // tick clock for "edit window" countdown
  useEffect(() => { const t = setInterval(() => force((x) => x + 1), 15000); return () => clearInterval(t); }, []);

  // Load profiles, admins, friends, pins
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [{ data: p }, { data: r }, { data: f }, { data: pn }] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name").order("username"),
        supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
        supabase.from("user_friends").select("friend_id,trusted").eq("user_id", userId),
        supabase.from("dm_pins").select("peer_id,priority").eq("user_id", userId),
      ]);
      setProfiles((p ?? []).filter((x: any) => x.id !== userId));
      setAdminIds(new Set((r ?? []).map((x: any) => x.user_id)));
      setFriends(new Map((f ?? []).map((x: any) => [x.friend_id, !!x.trusted])));
      setPins(new Map((pn ?? []).map((x: any) => [x.peer_id, !!x.priority])));
    })();
  }, [userId]);

  // Load recent conversations + unread counts
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("sender_id,recipient_id,created_at,read")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(200);
      const seen: string[] = [];
      const u = new Map<string, number>();
      (data ?? []).forEach((m: any) => {
        const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
        if (!seen.includes(other)) seen.push(other);
        if (m.recipient_id === userId && !m.read) u.set(other, (u.get(other) ?? 0) + 1);
      });
      setRecents(seen);
      setUnread(u);
    })();
  }, [userId, messages.length]);

  // Subscribe to new/updated messages + reactions for active thread
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`dm-thread-${userId}-${active?.id ?? "none"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload: any) => {
        const m = payload.new as DM;
        if (!active) return;
        const isThread = (m.sender_id === userId && m.recipient_id === active.id) || (m.sender_id === active.id && m.recipient_id === userId);
        if (!isThread) return;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        setNewMessageIds((s) => { const n = new Set(s); n.add(m.id); return n; });
        setTimeout(() => setNewMessageIds((s) => { const n = new Set(s); n.delete(m.id); return n; }), 2000);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload: any) => {
        const m = payload.new as DM;
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, ...m } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "direct_messages" }, (payload: any) => {
        const m = payload.old as { id: string };
        setMessages((prev) => prev.filter((x) => x.id !== m.id));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, (payload: any) => {
        if (payload.eventType === "INSERT") setReactions((r) => [...r, payload.new as Reaction]);
        else if (payload.eventType === "DELETE") setReactions((r) => r.filter((x) => x.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, active?.id]);

  // Presence + typing per thread
  useEffect(() => {
    if (!userId || !active) { setPeerTyping(false); return; }
    const ch = supabase.channel(`dm-presence-${[userId, active.id].sort().join("-")}`, {
      config: { presence: { key: userId } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const peer = state[active.id]?.[0];
      setPeerTyping(!!peer?.typing);
    });
    ch.on("broadcast", { event: "typing" }, ({ payload }: any) => {
      if (payload?.from === active.id) {
        setPeerTyping(true);
        clearTimeout((window as any).__typingT);
        (window as any).__typingT = setTimeout(() => setPeerTyping(false), 2500);
      }
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ typing: false, status: myStatus });
    });
    (window as any).__presenceCh = ch;
    return () => { supabase.removeChannel(ch); (window as any).__presenceCh = null; };
  }, [userId, active?.id, myStatus]);

  // Global presence — who is online across the app
  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel("global-presence", { config: { presence: { key: userId } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, any[]>;
      const ids = new Set<string>();
      Object.entries(state).forEach(([k, arr]) => {
        const s = (arr?.[0] as any)?.status as PresenceStatus | undefined;
        if (s && s !== "invisible") ids.add(k);
      });
      setOnlineIds(ids);
    });
    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ status: myStatus });
    });
    return () => { supabase.removeChannel(ch); };
  }, [userId, myStatus]);

  // Load thread + reactions when active changes
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
      if (msgs.length) {
        const { data: rx } = await supabase.from("message_reactions").select("*").in("message_id", msgs.map((m) => m.id));
        setReactions((rx ?? []) as Reaction[]);
      } else setReactions([]);
      await supabase.from("direct_messages").update({ read: true }).eq("recipient_id", userId).eq("sender_id", active.id).eq("read", false);
    })();
  }, [userId, active?.id]);

  // Sticky auto-scroll
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = messagesRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 160;
    if (nearBottom) c.scrollTop = c.scrollHeight;
  }, [messages.length, peerTyping]);

  // Search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return profiles.filter((p) => p.username.toLowerCase().includes(q) || (p.display_name || "").toLowerCase().includes(q)).slice(0, 30);
  }, [profiles, search]);

  // Smart inbox sorting: priority > pinned > friends > recent > others
  const sortedConvos = useMemo(() => {
    const all = recents.map((id) => profiles.find((p) => p.id === id)).filter(Boolean) as Profile[];
    const score = (p: Profile) => {
      let s = 0;
      const pn = pins.get(p.id);
      if (pn === true) s += 1000; // priority
      else if (pn === false || pins.has(p.id)) s += 500; // pinned
      if (friends.has(p.id)) s += friends.get(p.id) ? 300 : 200;
      if (unread.get(p.id)) s += 100 + Math.min(50, unread.get(p.id)!);
      if (adminIds.has(p.id)) s += 50;
      return s;
    };
    return [...all].sort((a, b) => score(b) - score(a));
  }, [recents, profiles, pins, friends, adminIds, unread]);

  // Smart buckets for display
  const buckets = useMemo(() => {
    const priority: Profile[] = [], pinned: Profile[] = [], friendsArr: Profile[] = [], spam: Profile[] = [], other: Profile[] = [];
    sortedConvos.forEach((p) => {
      if (pins.get(p.id) === true) priority.push(p);
      else if (pins.has(p.id)) pinned.push(p);
      else if (friends.has(p.id)) friendsArr.push(p);
      else if (!adminIds.has(p.id) && !friends.has(p.id)) {
        // unknown user → spam if no exchange yet (very few messages from us)
        other.push(p);
      } else other.push(p);
    });
    return { priority, pinned, friends: friendsArr, other, spam };
  }, [sortedConvos, pins, friends, adminIds]);

  // Send / edit
  const send = useCallback(async () => {
    if (!userId || !active) return;
    const content = text.trim();
    if (!content) return;
    setText("");
    if (editing) {
      const { error } = await supabase.from("direct_messages").update({ content, edited_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) toast.error(error.message);
      setEditing(null);
      return;
    }
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic: DM = {
      id: tmpId, sender_id: userId, recipient_id: active.id, content,
      created_at: new Date().toISOString(), read: false, hidden_by_admin: false,
      reply_to_id: replyTo?.id ?? null,
    };
    setMessages((m) => [...m, optimistic]);
    const reply = replyTo;
    setReplyTo(null);
    const { error, data } = await supabase.from("direct_messages")
      .insert({ sender_id: userId, recipient_id: active.id, content, reply_to_id: reply?.id ?? null })
      .select().single();
    if (error) { toast.error(error.message); setMessages((m) => m.filter((x) => x.id !== tmpId)); return; }
    setMessages((m) => {
      const withoutTmp = m.filter((x) => x.id !== tmpId);
      if (withoutTmp.some((x) => x.id === (data as DM).id)) return withoutTmp;
      return [...withoutTmp, data as DM];
    });
  }, [userId, active, text, editing, replyTo]);

  // Typing broadcast
  const typingTimer = useRef<any>(null);
  const onType = (v: string) => {
    setText(v);
    const ch = (window as any).__presenceCh;
    if (ch && active) {
      ch.send({ type: "broadcast", event: "typing", payload: { from: userId } });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {}, 1500);
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!userId) return;
    const mine = reactions.find((r) => r.message_id === msgId && r.user_id === userId && r.emoji === emoji);
    if (mine) {
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: msgId, user_id: userId, emoji });
    }
    setReactionPickerFor(null);
  };

  const unsend = async (m: DM) => {
    if (!confirm("Unsend this message? It will be removed for both of you.")) return;
    const { error } = await supabase.from("direct_messages").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    setMessages((mm) => mm.filter((x) => x.id !== m.id));
  };

  const startEdit = (m: DM) => { setEditing(m); setText(m.content); setReplyTo(null); };
  const cancelEdit = () => { setEditing(null); setText(""); };

  const togglePin = async (peer: Profile) => {
    if (!userId) return;
    if (pins.has(peer.id)) {
      await supabase.from("dm_pins").delete().eq("user_id", userId).eq("peer_id", peer.id);
      setPins((p) => { const n = new Map(p); n.delete(peer.id); return n; });
    } else {
      await supabase.from("dm_pins").insert({ user_id: userId, peer_id: peer.id, priority: false });
      setPins((p) => { const n = new Map(p); n.set(peer.id, false); return n; });
    }
  };
  const togglePriority = async (peer: Profile) => {
    if (!userId) return;
    const cur = pins.get(peer.id);
    if (cur === undefined) {
      await supabase.from("dm_pins").insert({ user_id: userId, peer_id: peer.id, priority: true });
    } else {
      await supabase.from("dm_pins").update({ priority: !cur }).eq("user_id", userId).eq("peer_id", peer.id);
    }
    setPins((p) => { const n = new Map(p); n.set(peer.id, !cur); return n; });
  };
  const toggleFriend = async (peer: Profile) => {
    if (!userId) return;
    if (friends.has(peer.id)) {
      await supabase.from("user_friends").delete().eq("user_id", userId).eq("friend_id", peer.id);
      setFriends((p) => { const n = new Map(p); n.delete(peer.id); return n; });
    } else {
      await supabase.from("user_friends").insert({ user_id: userId, friend_id: peer.id, trusted: false });
      setFriends((p) => { const n = new Map(p); n.set(peer.id, false); return n; });
    }
  };

  const adminDelete = async (id: string) => { await supabase.from("direct_messages").delete().eq("id", id); setMessages((m) => m.filter((x) => x.id !== id)); };
  const adminHide = async (id: string) => { await supabase.from("direct_messages").update({ hidden_by_admin: true }).eq("id", id); setMessages((m) => m.map((x) => x.id === id ? { ...x, hidden_by_admin: true } : x)); };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!userId) return (
    <div className="p-12 text-center">
      <div className="text-xl">Sign in to use XenoText</div>
      <Link to="/login" className="btn-ice mt-6 inline-flex">Sign in</Link>
    </div>
  );

  const msgById = new Map(messages.map((m) => [m.id, m]));

  return (
    <PageShell>
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs tracking-brand text-ice">XENOTEXT</div>
          <h1 className="text-3xl font-light mt-1">Direct Messages</h1>
          <div className="text-xs text-muted-foreground mt-1">Signed in as {username}{isAdmin && <span className="text-ice"> · ADMIN</span>}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status:</span>
          {(["online","idle","invisible"] as PresenceStatus[]).map((s) => (
            <button key={s} onClick={() => setMyStatus(s)}
              className={`px-2 py-1 rounded border transition ${myStatus === s ? "border-ice text-ice bg-ice/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${s === "online" ? "bg-emerald-400" : s === "idle" ? "bg-amber-400" : "bg-muted"}`} />
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-[320px_1fr] gap-4 min-h-[70vh]">
        <aside className="glass rounded-xl p-3 flex flex-col">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…"
            className="w-full bg-input/40 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ice" />
          <div className="mt-3 overflow-y-auto max-h-[65vh] space-y-3">
            {search ? (
              <Bucket label="SEARCH RESULTS" items={filtered} render={(p) => (
                <UserRow key={p.id} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)}
                  unread={unread.get(p.id)} online={onlineIds.has(p.id)}
                  pinned={pins.has(p.id)} priority={pins.get(p.id) === true} friend={friends.has(p.id)}
                  onClick={() => setActive(p)} />
              )} empty={`No users match "${search}".`} />
            ) : (
              <>
                {buckets.priority.length > 0 && <Bucket label="⭐ PRIORITY" items={buckets.priority} render={(p) => (
                  <UserRow key={p.id} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)} unread={unread.get(p.id)} online={onlineIds.has(p.id)} pinned priority friend={friends.has(p.id)} onClick={() => setActive(p)} />
                )} />}
                {buckets.pinned.length > 0 && <Bucket label="📌 PINNED" items={buckets.pinned} render={(p) => (
                  <UserRow key={p.id} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)} unread={unread.get(p.id)} online={onlineIds.has(p.id)} pinned friend={friends.has(p.id)} onClick={() => setActive(p)} />
                )} />}
                {buckets.friends.length > 0 && <Bucket label="🤝 FRIENDS" items={buckets.friends} render={(p) => (
                  <UserRow key={p.id} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)} unread={unread.get(p.id)} online={onlineIds.has(p.id)} friend onClick={() => setActive(p)} />
                )} />}
                {buckets.other.length > 0 && <Bucket label="RECENT" items={buckets.other} render={(p) => (
                  <UserRow key={p.id} p={p} active={active?.id === p.id} isAdmin={adminIds.has(p.id)} unread={unread.get(p.id)} online={onlineIds.has(p.id)} onClick={() => setActive(p)} />
                )} />}
                {sortedConvos.length === 0 && <div className="text-xs text-muted-foreground p-3">Search for a user above to start a conversation.</div>}
              </>
            )}
          </div>
        </aside>

        <section className="glass-strong rounded-xl flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Select a user to start messaging</div>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${onlineIds.has(active.id) ? "bg-emerald-400 shadow-[0_0_8px_oklch(0.78_0.15_150)]" : "bg-muted"}`} />
                    <span className="truncate">{active.display_name || active.username}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">@{active.username}{adminIds.has(active.id) && <span className="text-ice"> · ADMIN</span>}</div>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <button onClick={() => togglePriority(active)} title="Priority (starred)" className={`px-2 py-1 rounded ${pins.get(active.id) === true ? "text-amber-300" : "text-muted-foreground hover:text-foreground"}`}>⭐</button>
                  <button onClick={() => togglePin(active)} title="Pin chat" className={`px-2 py-1 rounded ${pins.has(active.id) ? "text-ice" : "text-muted-foreground hover:text-foreground"}`}>📌</button>
                  <button onClick={() => toggleFriend(active)} title="Friend" className={`px-2 py-1 rounded ${friends.has(active.id) ? "text-emerald-300" : "text-muted-foreground hover:text-foreground"}`}>🤝</button>
                  {isAdmin && <span className="text-[10px] tracking-brand text-ice px-2 py-1 rounded bg-ice/10">ADMIN</span>}
                </div>
              </div>
              <div ref={messagesRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  const isNew = newMessageIds.has(m.id);
                  const replyMsg = m.reply_to_id ? msgById.get(m.reply_to_id) : null;
                  const msgRx = reactions.filter((r) => r.message_id === m.id);
                  const counts = msgRx.reduce<Record<string, number>>((a, r) => { a[r.emoji] = (a[r.emoji] ?? 0) + 1; return a; }, {});
                  const myRx = new Set(msgRx.filter((r) => r.user_id === userId).map((r) => r.emoji));
                  const age = Date.now() - new Date(m.created_at).getTime();
                  const canEdit = mine && !String(m.id).startsWith("tmp-") && age < EDIT_WINDOW_MS;
                  const status = mine ? (m.read ? "read" : (m.delivered_at ? "delivered" : "sent")) : null;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} group items-end gap-2`}>
                      {!mine && isAdmin && !String(m.id).startsWith("tmp-") && (
                        <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1">
                          <button onClick={() => adminHide(m.id)} className="text-[10px] px-1.5 rounded bg-white/10 hover:bg-white/20">hide</button>
                          <button onClick={() => adminDelete(m.id)} className="text-[10px] px-1.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">del</button>
                        </div>
                      )}
                      <div className="relative max-w-[75%]">
                        {replyMsg && (
                          <div className={`text-[11px] px-3 py-1 rounded-t-xl border-l-2 ${mine ? "bg-ice/10 border-ice text-foreground/80" : "bg-white/5 border-muted text-muted-foreground"}`}>
                            ↪ {replyMsg.content.slice(0, 80)}{replyMsg.content.length > 80 ? "…" : ""}
                          </div>
                        )}
                        <div className={`rounded-2xl px-4 py-2 text-sm transition ${mine ? "bg-ice text-black" : "bg-white/10 text-foreground"} ${m.hidden_by_admin ? "opacity-40 italic" : ""} ${isNew ? "msg-glow" : ""}`}>
                          {m.content}
                          <div className={`text-[10px] mt-1 flex items-center gap-2 ${mine ? "text-black/60" : "text-muted-foreground"}`}>
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            {m.edited_at && <span className="italic">edited</span>}
                            {status && <span>· {status === "read" ? "✓✓ read" : status === "delivered" ? "✓✓ delivered" : "✓ sent"}</span>}
                          </div>
                        </div>
                        {Object.keys(counts).length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {Object.entries(counts).map(([e, n]) => (
                              <button key={e} onClick={() => toggleReaction(m.id, e)}
                                className={`text-xs px-1.5 py-0.5 rounded-full border transition ${myRx.has(e) ? "border-ice bg-ice/15 text-ice" : "border-border bg-white/5 hover:bg-white/10"}`}>
                                {e} {n}
                              </button>
                            ))}
                          </div>
                        )}
                        {reactionPickerFor === m.id && (
                          <div className="absolute -top-10 left-0 z-10 glass rounded-full px-2 py-1 flex gap-1 shadow-lg">
                            {REACTIONS.map((e) => <button key={e} onClick={() => toggleReaction(m.id, e)} className="text-lg hover:scale-125 transition">{e}</button>)}
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition flex flex-col gap-1 text-[10px]">
                        <button onClick={() => setReactionPickerFor((x) => x === m.id ? null : m.id)} title="React" className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20">😊</button>
                        <button onClick={() => setReplyTo(m)} title="Reply" className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20">↪</button>
                        {canEdit && <button onClick={() => startEdit(m)} title="Edit" className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20">✎</button>}
                        {canEdit && <button onClick={() => unsend(m)} title="Unsend" className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30">⌫</button>}
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="text-center text-xs text-muted-foreground mt-8">No messages yet — say hi.</div>}
                {peerTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="typing-dot" /><span className="typing-dot" style={{ animationDelay: "0.15s" }} /><span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                    <span>{active.display_name || active.username} is typing…</span>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3">
                {replyTo && (
                  <div className="mb-2 flex items-center justify-between text-xs bg-ice/5 border-l-2 border-ice rounded px-3 py-2">
                    <span className="truncate">↪ Replying to: {replyTo.content.slice(0, 100)}</span>
                    <button onClick={() => setReplyTo(null)} className="ml-2 text-muted-foreground hover:text-foreground">✕</button>
                  </div>
                )}
                {editing && (
                  <div className="mb-2 flex items-center justify-between text-xs bg-amber-500/10 border-l-2 border-amber-400 rounded px-3 py-2">
                    <span>Editing message…</span>
                    <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">cancel</button>
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
                  <input value={text} onChange={(e) => onType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === "Escape") { cancelEdit(); setReplyTo(null); } }}
                    placeholder={editing ? "Edit message…" : `Message ${active.display_name || active.username}…`}
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

function Bucket({ label, items, render, empty }: { label: string; items: Profile[]; render: (p: Profile) => React.ReactNode; empty?: string }) {
  if (items.length === 0 && !empty) return null;
  return (
    <div>
      <div className="text-[10px] tracking-brand text-ice/70 px-2 pb-1">{label}</div>
      <div className="space-y-1">{items.length ? items.map(render) : <div className="text-xs text-muted-foreground p-3">{empty}</div>}</div>
    </div>
  );
}

function UserRow({ p, active, isAdmin, unread, online, pinned, priority, friend, onClick }: {
  p: Profile; active: boolean; isAdmin: boolean; unread?: number; online?: boolean;
  pinned?: boolean; priority?: boolean; friend?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded text-sm transition flex items-center justify-between gap-2 ${active ? "bg-ice/15 text-ice" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
      <span className="flex items-center gap-2 min-w-0">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${online ? "bg-emerald-400 shadow-[0_0_6px_oklch(0.78_0.15_150)]" : "bg-muted"}`} />
        <span className="truncate">{p.display_name || p.username}</span>
        {priority && <span title="Priority" className="text-amber-300">⭐</span>}
        {pinned && !priority && <span title="Pinned" className="text-ice">📌</span>}
        {friend && <span title="Friend" className="text-emerald-300">🤝</span>}
      </span>
      <span className="flex items-center gap-2 shrink-0">
        {isAdmin && <span className="text-[9px] tracking-brand text-ice">ADMIN</span>}
        {!!unread && <span className="text-[10px] bg-ice text-black rounded-full px-1.5 min-w-[18px] text-center">{unread}</span>}
      </span>
    </button>
  );
}
