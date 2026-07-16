-- Permet de relier les lignes de réservation d'un même paiement (un client + ses invités)
-- pour pouvoir réafficher la liste complète des participants, et de tracer comment
-- chaque réservation a été payée pour un historique des achats complet.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS booking_group_id uuid,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric NOT NULL DEFAULT 0;
