CREATE TABLE public.client_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  card_name text NOT NULL,
  total_sessions integer NOT NULL DEFAULT 10,
  used_sessions integer NOT NULL DEFAULT 0,
  expires_at date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to client_cards" ON public.client_cards FOR ALL TO public USING (true) WITH CHECK (true);