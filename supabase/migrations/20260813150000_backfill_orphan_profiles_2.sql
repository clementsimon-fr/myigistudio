-- Deuxième passe de la migration 20260806163000 (backfill_orphan_profiles_and_email_uniqueness) :
-- 3 comptes auth.users créés le 12/08/2026 s'étaient à nouveau retrouvés sans ligne
-- client_profiles associée (dont un compte réel d'utilisateur, pas seulement des comptes de
-- test), alors que le trigger on_auth_user_created est bien actif et fonctionne pour les
-- nouvelles inscriptions testées le 13/08. Cause probable : une fenêtre où une migration
-- était en cours d'application en parallèle sur ce projet pendant que ces comptes se créaient.
--
-- Conséquence observée : session valide mais clientProfile introuvable côté client → navbar
-- vide (ni "Connexion" ni badge "Mon espace") et page Mon Espace bloquée en chargement infini
-- (CLIENT_NAME vide → l'effet de chargement des réservations ne se déclenchait jamais et ne
-- désactivait donc jamais le spinner). Voir les correctifs associés dans Navbar.tsx et
-- MonEspace.tsx (résilience à un profil manquant/pas encore chargé).
--
-- Déjà appliqué manuellement en production le 13/08/2026 avant l'écriture de cette migration
-- (vérifié : idempotent via NOT EXISTS, sans risque à rejouer).

INSERT INTO public.client_profiles (id, email, first_name, last_name, phone)
SELECT
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'first_name', ''),
  coalesce(u.raw_user_meta_data->>'last_name', ''),
  coalesce(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = u.id);
