
-- Add detailed client fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

-- Add feature_examples table for preset feature suggestions
CREATE TABLE IF NOT EXISTS public.feature_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  impact text NOT NULL DEFAULT 'retouche',
  target text NOT NULL DEFAULT 'autre',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to feature_examples" ON public.feature_examples FOR ALL USING (true) WITH CHECK (true);

-- Add price field to course_schedules for recurring events
ALTER TABLE public.course_schedules ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;
