
ALTER TABLE public.course_schedules ADD COLUMN IF NOT EXISTS inclusions text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS inclusions text NOT NULL DEFAULT '';
ALTER TABLE public.course_schedules ADD COLUMN IF NOT EXISTS card_yoga_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS card_yoga_count integer NOT NULL DEFAULT 0;
