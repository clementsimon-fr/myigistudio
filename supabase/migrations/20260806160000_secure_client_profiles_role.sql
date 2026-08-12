-- Sécurise client_profiles : jusqu'ici la policy "Allow all access to client_profiles"
-- (USING (true) WITH CHECK (true), TO public) permettait à n'importe quel compte connecté
-- de lire TOUS les profils et de modifier N'IMPORTE QUEL champ de N'IMPORTE QUEL profil, y
-- compris son propre `role` — un client pouvait donc s'auto-promouvoir admin/fournisseur
-- via un simple appel direct à l'API REST (la clé anon est publique, exposée dans le bundle JS).
--
-- Cette migration :
--   1. ajoute une fonction is_staff() (SECURITY DEFINER, pour éviter la récursion RLS)
--   2. remplace la policy unique par 4 policies granulaires (select/insert/update/delete)
--      basées sur "c'est mon propre profil" OU "je suis déjà admin/fournisseur"
--   3. ajoute un trigger qui neutralise silencieusement tout changement de `role` tenté par
--      quelqu'un qui n'est pas déjà admin/fournisseur (les appels serveur — trigger de
--      signup, edge functions en service_role, migrations SQL — n'ont pas de auth.uid() et
--      restent donc inchangés)

CREATE OR REPLACE FUNCTION public.is_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_profiles WHERE id = uid AND role IN ('admin', 'fournisseur')
  );
$$;

DROP POLICY IF EXISTS "Allow all access to client_profiles" ON public.client_profiles;

CREATE POLICY "client_profiles_select_own_or_staff" ON public.client_profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE POLICY "client_profiles_insert_own_or_staff" ON public.client_profiles
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE POLICY "client_profiles_update_own_or_staff" ON public.client_profiles
  FOR UPDATE USING (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE POLICY "client_profiles_delete_staff_only" ON public.client_profiles
  FOR DELETE USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- auth.uid() IS NULL : appel serveur (trigger de signup, edge function en
    -- service_role, migration) — on ne bloque pas ces cas légitimes.
    IF auth.uid() IS NOT NULL AND NOT public.is_staff(auth.uid()) THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.client_profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();
