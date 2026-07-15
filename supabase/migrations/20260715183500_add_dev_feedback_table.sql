CREATE TABLE IF NOT EXISTS public.dev_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'important',
  author_name text,
  author_phone text,
  author_role text,
  status text NOT NULL DEFAULT 'nouveau',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dev_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit dev feedback"
  ON public.dev_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read dev feedback"
  ON public.dev_feedback FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update dev feedback"
  ON public.dev_feedback FOR UPDATE
  USING (true);
