GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "announce public read" ON public.announcements;
DROP POLICY IF EXISTS "announce admin read" ON public.announcements;

CREATE POLICY "announce active public read"
ON public.announcements
FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "announce admin read"
ON public.announcements
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));