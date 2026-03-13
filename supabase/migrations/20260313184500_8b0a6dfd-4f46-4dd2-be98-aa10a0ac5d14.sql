CREATE TABLE public.planned_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  date date NOT NULL,
  time text NOT NULL DEFAULT '09:00',
  end_time text NOT NULL DEFAULT '10:00',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.planned_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to planned_sessions" ON public.planned_sessions
  FOR ALL TO public USING (true) WITH CHECK (true);