
-- Batch 1: Reactions, replies, edit/unsend, delivered status
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz DEFAULT now();

-- Allow senders to update their own messages (for edit/unsend within 2 min, enforced by app + this policy)
DROP POLICY IF EXISTS "dm sender update own" ON public.direct_messages;
CREATE POLICY "dm sender update own"
ON public.direct_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions read participants"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id = message_reactions.message_id
      AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "reactions insert participants"
ON public.message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id = message_reactions.message_id
      AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
  )
);

CREATE POLICY "reactions delete own"
ON public.message_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Pinned chats & priority per user
CREATE TABLE IF NOT EXISTS public.dm_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  peer_id uuid NOT NULL,
  priority boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, peer_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_pins TO authenticated;
GRANT ALL ON public.dm_pins TO service_role;

ALTER TABLE public.dm_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pins own all"
ON public.dm_pins
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Friends / trusted users
CREATE TABLE IF NOT EXISTS public.user_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  trusted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_friends TO authenticated;
GRANT ALL ON public.user_friends TO service_role;

ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friends own all"
ON public.user_friends
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friends read where i am friend"
ON public.user_friends
FOR SELECT
TO authenticated
USING (auth.uid() = friend_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
