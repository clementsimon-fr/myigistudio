INSERT INTO storage.buckets (id, name, public) VALUES ('activity-images', 'activity-images', true);

CREATE POLICY "Public read access for activity images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'activity-images');

CREATE POLICY "Allow upload to activity images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'activity-images');

CREATE POLICY "Allow update activity images"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'activity-images');

CREATE POLICY "Allow delete activity images"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'activity-images');