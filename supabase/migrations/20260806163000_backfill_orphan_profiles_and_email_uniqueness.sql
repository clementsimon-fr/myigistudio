-- Garantit l'invariant "1 client = 1 email" à deux niveaux :
--
-- 1. Il existe aujourd'hui 5 comptes dans auth.users SANS ligne client_profiles associée
--    (clement.simon@lamache.org, clement.simon@holischool.fr, et 3 comptes de test
--    *@test.myigistudio.local créés entre le 4 et le 16 juillet). Le trigger
--    handle_new_auth_user() existait déjà à ces dates ; la cause exacte de l'absence de
--    profil n'est pas certaine (nettoyage manuel de client_profiles sans supprimer le compte
--    auth ?), mais le résultat est le même : si l'une de ces personnes se connecte
--    aujourd'hui, l'app ne trouve aucun profil (pas de nom, pas de téléphone, pas de rôle).
--    On les recrée avec les infos disponibles dans auth.users.
--
-- 2. Le contrôle de doublon dans l'edge function create-guest-account compare les emails
--    avec `=` (sensible à la casse) : "Jean@Mail.com" puis "jean@mail.com" pourraient créer
--    deux comptes distincts pour la même personne. On ajoute une contrainte UNIQUE
--    insensible à la casse au niveau de la base, qui est la vraie garantie (indépendante de
--    ce que fait ou non le code applicatif, et blindée contre un futur oubli).

-- Étape 1 : recréer les profils manquants
INSERT INTO public.client_profiles (id, email, first_name, last_name, phone)
SELECT
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'first_name', ''),
  coalesce(u.raw_user_meta_data->>'last_name', ''),
  coalesce(u.raw_user_meta_data->>'phone', '')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.client_profiles cp WHERE cp.id = u.id);

-- Étape 2 : un seul compte possible par email, quelle que soit la casse saisie.
-- (Aucune ligne à email vide/NULL aujourd'hui, donc pas besoin d'index partiel.)
CREATE UNIQUE INDEX IF NOT EXISTS client_profiles_email_unique_ci
  ON public.client_profiles (lower(email));
