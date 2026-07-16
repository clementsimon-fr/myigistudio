-- Permet à Élodie de choisir, par fiche yoga, si le tarif se paie en "cours" (cartes/carte à
-- l'unité, comportement historique) ou en un "prix" fixe en euros (comme pour la poterie).
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS tariff_mode text NOT NULL DEFAULT 'cours';
