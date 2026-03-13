
CREATE TABLE public.course_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day text NOT NULL,
  time text NOT NULL,
  end_time text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to course_schedules" ON public.course_schedules
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Migrate existing course data into schedules
INSERT INTO public.course_schedules (course_id, day, time, end_time)
SELECT id, unnest(CASE WHEN array_length(days, 1) > 0 THEN days ELSE ARRAY[day] END), time, end_time
FROM public.courses;
