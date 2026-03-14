
-- Feature requests table (for Elodie admin)
CREATE TABLE public.feature_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  urgency INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'todo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to feature_requests" ON public.feature_requests FOR ALL TO public USING (true) WITH CHECK (true);

-- Client feedbacks table
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  rating INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to feedbacks" ON public.feedbacks FOR ALL TO public USING (true) WITH CHECK (true);
