-- Le formulaire d'inscription (Register.tsx et l'invité pendant la réservation) saisit
-- désormais un numéro de téléphone : le trigger de création de profil doit le reprendre
-- depuis les métadonnées auth, comme il le fait déjà pour first_name/last_name.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_profiles (id, email, first_name, last_name, phone)
  VALUES (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  RETURN new;
END;
$$;
