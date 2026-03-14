ALTER TABLE public.feature_requests 
  ADD COLUMN impact text NOT NULL DEFAULT 'retouche',
  ADD COLUMN ticket_group text;