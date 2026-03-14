
CREATE TABLE public.conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'annulation',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  applies_to text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to conditions"
ON public.conditions
FOR ALL
TO public
USING (true)
WITH CHECK (true);
