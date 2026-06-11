
CREATE TABLE public.home_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_buttons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_buttons TO authenticated;
GRANT ALL ON public.home_buttons TO service_role;

ALTER TABLE public.home_buttons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "home_buttons readable by all"
  ON public.home_buttons FOR SELECT
  USING (true);

CREATE POLICY "home_buttons writable by authenticated"
  ON public.home_buttons FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);

INSERT INTO public.home_buttons (key, title, sort_order) VALUES
  ('yoga', 'Yoga', 1),
  ('poterie', 'Poterie', 2),
  ('decouvrir', 'Histoire', 3)
ON CONFLICT (key) DO NOTHING;
