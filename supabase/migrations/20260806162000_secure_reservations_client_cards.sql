-- Sécurise reservations et client_cards : jusqu'ici "Allow all access ... USING (true) WITH
-- CHECK (true)" permettait à n'importe quel compte connecté de lire/modifier les réservations
-- et cartes de crédit de N'IMPORTE QUEL client (nom, téléphone, statut de paiement, séances
-- restantes...), et de les altérer (annuler la résa d'un autre, gonfler ses propres séances).
--
-- Étape 1 — rattachement rétroactif : `user_id` est déjà rempli pour la plupart des résas/cartes
-- créées depuis un compte connecté, mais reste NULL pour : les invités ajoutés en 2e+ position
-- dans une réservation groupée, et tout ce qu'Élodie a ajouté à la main dans l'admin (qui ne
-- renseigne pas user_id). On rattache automatiquement UNIQUEMENT quand client_name correspond
-- à EXACTEMENT un compte dans client_profiles (aucun rattachement en cas d'homonymie, pour ne
-- jamais risquer de relier la résa de quelqu'un au compte d'un homonyme).
--
-- Étape 2 — policies granulaires (comme client_profiles) : chacun voit/modifie ses propres
-- lignes, le staff (admin/fournisseur) voit tout comme aujourd'hui. Exception : un client peut
-- aussi *lire* (pas modifier) les lignes d'un booking_group_id dont il possède une ligne, pour
-- que "Mon Espace" continue d'afficher les noms des invités qu'il a ajoutés à sa réservation.
--
-- Ce qui reste NON couvert après cette migration (limite du rattachement par nom) : une résa/
-- carte dont client_name ne matche aucun compte, ou matche 2+ comptes homonymes, garde
-- user_id = NULL — visible et gérable par le staff comme avant, mais invisible dans "Mon
-- Espace" du client tant qu'Élodie ne l'aura pas reliée manuellement (pas d'UI pour ça
-- aujourd'hui). Voir la requête de contrôle en bas de fichier.

-- Étape 1a : reservations
UPDATE public.reservations r
SET user_id = m.id
FROM (
  SELECT id, lower(trim(first_name || ' ' || last_name)) AS full_name
  FROM public.client_profiles
) m
WHERE r.user_id IS NULL
  AND lower(trim(r.client_name)) = m.full_name
  AND (
    SELECT count(*) FROM public.client_profiles cp2
    WHERE lower(trim(cp2.first_name || ' ' || cp2.last_name)) = lower(trim(r.client_name))
  ) = 1;

-- Étape 1b : client_cards
UPDATE public.client_cards c
SET user_id = m.id
FROM (
  SELECT id, lower(trim(first_name || ' ' || last_name)) AS full_name
  FROM public.client_profiles
) m
WHERE c.user_id IS NULL
  AND lower(trim(c.client_name)) = m.full_name
  AND (
    SELECT count(*) FROM public.client_profiles cp2
    WHERE lower(trim(cp2.first_name || ' ' || cp2.last_name)) = lower(trim(c.client_name))
  ) = 1;

-- Étape 2 : fonction d'aide pour la visibilité des invités d'un même booking_group_id,
-- SECURITY DEFINER pour lire reservations sans repasser par ses propres policies (évite toute
-- récursion RLS).
CREATE OR REPLACE FUNCTION public.owns_booking_group(gid uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reservations WHERE booking_group_id = gid AND user_id = uid
  );
$$;

-- reservations
DROP POLICY IF EXISTS "Allow all access to reservations" ON public.reservations;

CREATE POLICY "reservations_select_own_group_or_staff" ON public.reservations
  FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_staff(auth.uid())
    OR (booking_group_id IS NOT NULL AND public.owns_booking_group(booking_group_id, auth.uid()))
  );

-- user_id IS NULL reste autorisé à l'insertion : c'est le cas normal des invités ajoutés en
-- 2e+ position d'une réservation groupée (voir BookingSheet.tsx, participantRows()).
CREATE POLICY "reservations_insert_own_or_guest_or_staff" ON public.reservations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL OR public.is_staff(auth.uid())
  );

CREATE POLICY "reservations_update_own_or_staff" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "reservations_delete_staff_only" ON public.reservations
  FOR DELETE USING (public.is_staff(auth.uid()));

-- client_cards
DROP POLICY IF EXISTS "Allow all access to client_cards" ON public.client_cards;

CREATE POLICY "client_cards_select_own_or_staff" ON public.client_cards
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "client_cards_insert_own_or_staff" ON public.client_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "client_cards_update_own_or_staff" ON public.client_cards
  FOR UPDATE USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "client_cards_delete_staff_only" ON public.client_cards
  FOR DELETE USING (public.is_staff(auth.uid()));

-- Requête de contrôle à lancer après coup (SQL Editor) pour voir ce qui n'a pas pu être relié
-- automatiquement, et nécessite un rattachement manuel ou reste "invité sans compte" :
--
-- SELECT client_name, count(*) FROM public.reservations WHERE user_id IS NULL GROUP BY client_name ORDER BY 2 DESC;
-- SELECT client_name, count(*) FROM public.client_cards WHERE user_id IS NULL GROUP BY client_name ORDER BY 2 DESC;
