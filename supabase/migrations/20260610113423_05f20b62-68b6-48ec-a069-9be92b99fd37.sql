ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS card_yoga_count integer DEFAULT 0;