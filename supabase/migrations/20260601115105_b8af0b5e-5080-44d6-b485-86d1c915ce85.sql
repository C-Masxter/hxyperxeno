
-- 1) downloads: restrict reads
DROP POLICY IF EXISTS "downloads auth read" ON public.downloads;
CREATE POLICY "downloads approved buyer or admin read"
ON public.downloads FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.purchase_requests pr
    WHERE pr.user_id = auth.uid()
      AND pr.product_key = downloads.product_key
      AND pr.status = 'approved'
  )
);

-- 2) user_roles: drop overly broad read
DROP POLICY IF EXISTS "roles readable by all auth" ON public.user_roles;
CREATE POLICY "roles read own or admin rows"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR role = 'admin'
  OR is_admin(auth.uid())
);

-- 3) security_logs: restrict insert to authenticated
DROP POLICY IF EXISTS "security insert any" ON public.security_logs;
CREATE POLICY "security insert authenticated"
ON public.security_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 4) site_settings: restrict to admin reads
DROP POLICY IF EXISTS "settings public read" ON public.site_settings;
CREATE POLICY "settings admin read"
ON public.site_settings FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

REVOKE SELECT ON public.site_settings FROM anon;

-- 5) notifications: drop broadcast-null read for non-admins
DROP POLICY IF EXISTS "user read own notif" ON public.notifications;
CREATE POLICY "user read own notif"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 6) Revoke EXECUTE on security-definer helpers from anon
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 7) Realtime RLS for direct_messages topic subscriptions
-- Restrict realtime broadcasts so users only receive their own DM events.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm realtime own only" ON realtime.messages;
CREATE POLICY "dm realtime own only"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Allow only when the realtime row corresponds to a DM the user is part of
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    WHERE dm.id::text = (realtime.messages.extension::jsonb ->> 'record_id')
      AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
  )
);
