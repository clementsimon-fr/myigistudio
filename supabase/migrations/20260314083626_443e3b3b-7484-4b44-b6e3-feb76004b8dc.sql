
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS modalities text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS modalities text NOT NULL DEFAULT '';
