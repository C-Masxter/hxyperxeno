
DROP POLICY IF EXISTS "flag insert any auth" ON public.ai_flagged_reports;
CREATE POLICY "flag insert auth"
ON public.ai_flagged_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
