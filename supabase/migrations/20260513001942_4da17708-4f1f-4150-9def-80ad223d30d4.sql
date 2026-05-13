
-- Credits / tier per user
CREATE TABLE public.ai_credits (
  user_id uuid PRIMARY KEY,
  balance numeric NOT NULL DEFAULT 10,
  daily_allowance numeric NOT NULL DEFAULT 10,
  tier text NOT NULL DEFAULT 'free',
  last_reset timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits read own or admin" ON public.ai_credits FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "credits admin write" ON public.ai_credits FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv own all" ON public.ai_conversations FOR ALL TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  mode text,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg own read" ON public.ai_messages FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "msg own insert" ON public.ai_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg admin delete" ON public.ai_messages FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Upgrade requests
CREATE TABLE public.ai_upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL,
  amount_cents integer NOT NULL,
  cashapp_username text NOT NULL,
  full_name text,
  email text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  ip_address text,
  user_agent text,
  device_info text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_upgrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upreq read own or admin" ON public.ai_upgrade_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "upreq insert own" ON public.ai_upgrade_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upreq admin update" ON public.ai_upgrade_requests FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "upreq admin delete" ON public.ai_upgrade_requests FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Flagged reports
CREATE TABLE public.ai_flagged_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  username text,
  content text NOT NULL,
  reason text NOT NULL,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_flagged_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flag admin read" ON public.ai_flagged_reports FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "flag insert any auth" ON public.ai_flagged_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "flag admin update" ON public.ai_flagged_reports FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "flag admin delete" ON public.ai_flagged_reports FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
