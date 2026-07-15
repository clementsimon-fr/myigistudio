ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS complementary_info text NOT NULL DEFAULT '';
ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS complementary_info text NOT NULL DEFAULT '';
