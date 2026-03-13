CREATE TABLE public.pricing_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sessions integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  validity text NOT NULL DEFAULT '1 mois',
  popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pricing_cards" ON public.pricing_cards
  FOR ALL TO public USING (true) WITH CHECK (true);

INSERT INTO public.pricing_cards (name, sessions, price, validity, popular, sort_order) VALUES
  ('Cours à l''unité', 1, 18, 'Séance', false, 0),
  ('Découverte', 3, 45, '1 mois', false, 1),
  ('Essentiel', 5, 70, '2 mois', false, 2),
  ('Régulier', 10, 130, '3 mois', true, 3),
  ('Passionné', 20, 240, '5 mois', false, 4),
  ('Amoureux', 40, 440, '6 mois', false, 5),
  ('Illimité', 9999, 1020, '12 mois', false, 6);