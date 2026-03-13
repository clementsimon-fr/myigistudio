ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS reminder_template text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS reminder_template text NOT NULL DEFAULT '';