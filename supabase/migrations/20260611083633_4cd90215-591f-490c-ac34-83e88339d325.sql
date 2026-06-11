DROP POLICY IF EXISTS "home_buttons writable by authenticated" ON public.home_buttons;
CREATE POLICY "home_buttons writable by all (demo)" ON public.home_buttons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT INSERT, UPDATE, DELETE ON public.home_buttons TO anon;