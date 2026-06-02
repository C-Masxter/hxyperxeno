DROP POLICY IF EXISTS "announce admin write" ON public.announcements;

CREATE POLICY "announce admin create"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "announce admin update"
ON public.announcements
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "announce admin delete"
ON public.announcements
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));