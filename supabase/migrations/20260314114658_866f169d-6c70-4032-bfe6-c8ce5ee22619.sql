
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS intensity text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS intensity text NOT NULL DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS reminder_timing text NOT NULL DEFAULT '1j';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS reminder_timing text NOT NULL DEFAULT '1j';
