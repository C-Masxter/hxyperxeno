
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS device_info text,
  ADD COLUMN IF NOT EXISTS country text;

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  hidden_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dm_sender_idx ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS dm_recipient_idx ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS dm_pair_idx ON public.direct_messages(sender_id, recipient_id, created_at);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dm read own or admin" ON public.direct_messages
  FOR SELECT TO authenticated
  USING ((auth.uid() = sender_id OR auth.uid() = recipient_id OR public.is_admin(auth.uid())) AND (NOT hidden_by_admin OR public.is_admin(auth.uid())));

CREATE POLICY "dm send own" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "dm update own read or admin" ON public.direct_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR public.is_admin(auth.uid()));

CREATE POLICY "dm admin delete" ON public.direct_messages
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
