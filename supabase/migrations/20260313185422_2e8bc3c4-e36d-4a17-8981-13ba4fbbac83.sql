-- Add spots/spots_left per schedule slot (not just per course)
ALTER TABLE public.course_schedules ADD COLUMN spots integer NOT NULL DEFAULT 12;
ALTER TABLE public.course_schedules ADD COLUMN spots_left integer NOT NULL DEFAULT 12;

-- Copy spots from parent course into each schedule
UPDATE public.course_schedules cs
SET spots = c.spots, spots_left = c.spots_left
FROM public.courses c
WHERE cs.course_id = c.id;

-- Create reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL DEFAULT 'Sophie',
  activity_name text NOT NULL,
  activity_type text NOT NULL DEFAULT 'course',
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE SET NULL,
  schedule_id uuid REFERENCES public.course_schedules(id) ON DELETE SET NULL,
  date date NOT NULL,
  time text NOT NULL,
  end_time text NOT NULL DEFAULT '',
  participants integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'confirmé',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to reservations" ON public.reservations
  FOR ALL TO public USING (true) WITH CHECK (true);