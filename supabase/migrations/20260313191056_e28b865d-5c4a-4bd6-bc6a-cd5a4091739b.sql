CREATE TABLE public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  specialties text[] NOT NULL DEFAULT '{}',
  bio text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to instructors" ON public.instructors
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Add instructor_id to courses (nullable, keeping backward compat with text instructor field)
ALTER TABLE public.courses ADD COLUMN instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL;

-- Add instructor_id to workshops
ALTER TABLE public.workshops ADD COLUMN instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL;