
ALTER TABLE public.pricing_cards ADD COLUMN payment_info text NOT NULL DEFAULT '';

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to site_settings" ON public.site_settings FOR ALL TO public USING (true) WITH CHECK (true);

INSERT INTO public.site_settings (key, value) VALUES ('pricing_notes', '');
