
INSERT INTO storage.buckets (id, name, public) VALUES ('filter-icons', 'filter-icons', true);

CREATE POLICY "Allow public read filter-icons" ON storage.objects FOR SELECT TO public USING (bucket_id = 'filter-icons');
CREATE POLICY "Allow public insert filter-icons" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'filter-icons');
CREATE POLICY "Allow public update filter-icons" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'filter-icons');
CREATE POLICY "Allow public delete filter-icons" ON storage.objects FOR DELETE TO public USING (bucket_id = 'filter-icons');
