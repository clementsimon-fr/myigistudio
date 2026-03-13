
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS image text NOT NULL DEFAULT '';
ALTER TABLE public.instructors ADD COLUMN IF NOT EXISTS photo_url text NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public) VALUES ('instructor-photos', 'instructor-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view instructor photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'instructor-photos');
CREATE POLICY "Anyone can upload instructor photos" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'instructor-photos');
CREATE POLICY "Anyone can update instructor photos" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'instructor-photos');
CREATE POLICY "Anyone can delete instructor photos" ON storage.objects FOR DELETE TO public USING (bucket_id = 'instructor-photos');
