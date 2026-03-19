CREATE TABLE public.interest_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  activity_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interest_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to interest_emails"
ON public.interest_emails
FOR ALL
TO public
USING (true)
WITH CHECK (true);