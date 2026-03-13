
ALTER TABLE public.courses ADD COLUMN long_description text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN long_description text NOT NULL DEFAULT '';
ALTER TABLE public.instructors ADD COLUMN urls text[] NOT NULL DEFAULT '{}';
