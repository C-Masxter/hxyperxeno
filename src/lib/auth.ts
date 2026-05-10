import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DOMAIN = "hyperxeno.local";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${DOMAIN}`;

export type SessionState = {
  loading: boolean;
  userId: string | null;
  username: string | null;
  isAdmin: boolean;
  isBanned: boolean;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    loading: true, userId: null, username: null, isAdmin: false, isBanned: false,
  });

  useEffect(() => {
    let mounted = true;
    const refresh = async (uid: string | null) => {
      if (!uid) { mounted && setState({ loading: false, userId: null, username: null, isAdmin: false, isBanned: false }); return; }
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("username").eq("id", uid).maybeSingle(),
      ]);
      const r = (roles ?? []).map((x: any) => x.role);
      mounted && setState({
        loading: false, userId: uid,
        username: profile?.username ?? null,
        isAdmin: r.includes("admin"),
        isBanned: r.includes("banned"),
      });
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { void refresh(s?.user?.id ?? null); });
    supabase.auth.getSession().then(({ data: { session } }) => refresh(session?.user?.id ?? null));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

export async function loginWithUsername(username: string, password: string) {
  return supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
}

export async function registerWithUsername(username: string, password: string) {
  return supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username: username.trim().toLowerCase() }, emailRedirectTo: window.location.origin },
  });
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
