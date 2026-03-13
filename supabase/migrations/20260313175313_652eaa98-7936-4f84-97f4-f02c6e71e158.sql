
-- Table pour les cours récurrents (yoga, pilates, etc.)
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'yoga',
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructor TEXT NOT NULL DEFAULT 'Élodie',
  spots INTEGER NOT NULL DEFAULT 12,
  spots_left INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les ateliers ponctuels
CREATE TABLE public.workshops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'poterie',
  date TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '14:00',
  duration TEXT NOT NULL DEFAULT '2h',
  price INTEGER NOT NULL DEFAULT 0,
  spots INTEGER NOT NULL DEFAULT 8,
  spots_left INTEGER NOT NULL DEFAULT 8,
  image TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS désactivé pour le moment (pas d'auth)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- Policies publiques temporaires (pas d'auth pour l'instant)
CREATE POLICY "Allow all access to courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to workshops" ON public.workshops FOR ALL USING (true) WITH CHECK (true);
