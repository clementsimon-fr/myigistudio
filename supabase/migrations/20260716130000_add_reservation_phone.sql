-- Permet de saisir un téléphone directement sur une réservation ajoutée manuellement par
-- l'admin (invité sans compte) pour qu'Élodie puisse le consulter dans la fiche personne.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS phone text;
