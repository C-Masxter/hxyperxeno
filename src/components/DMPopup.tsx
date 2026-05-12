import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";
import { useNavigate, useRouterState } from "@tanstack/react-router";

export function DMPopup() {
  const { userId, isAdmin } = useSession();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`dm-popup-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${userId}` }, async (payload: any) => {
        const m = payload.new;
        if (seen.current.has(m.id)) return;
        seen.current.add(m.id);
        if (path === "/xenotext") return; // already viewing
        const { data: p } = await supabase.from("profiles").select("username,display_name").eq("id", m.sender_id).maybeSingle();
        const sender = p?.display_name || p?.username || "Someone";
        const preview = m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content;
        toast(
          isAdmin ? `📬 [ADMIN] DM from ${sender}` : `💬 ${sender}`,
          {
            description: preview,
            duration: isAdmin ? 12000 : 6000,
            action: { label: "Open", onClick: () => nav({ to: "/xenotext" }) },
          }
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, isAdmin, path]);

  return null;
}
