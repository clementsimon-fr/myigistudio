
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS end_time text NOT NULL DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'hebdomadaire';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS days text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS end_time text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'ponctuel';
