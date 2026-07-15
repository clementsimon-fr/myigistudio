-- Foundations for real Supabase Auth (replaces the localStorage demo identity system).
-- Additive only: nullable columns, no destructive change to existing profiles/reservations/client_cards.
-- RLS stays permissive (USING (true)) until all app code writes user_id consistently — restricting it
-- prematurely would break the booking tunnel and admin screens that still key off client_name.

CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'admin', 'fournisseur')),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  reminder_sms boolean NOT NULL DEFAULT false,
  reminder_email boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to client_profiles" ON public.client_profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- New signups default to role 'client'. First/last name come from the metadata passed to
-- supabase.auth.signInWithOtp({ options: { data: { first_name, last_name } } }) at signup time.
CREATE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_profiles (id, email, first_name, last_name)
  VALUES (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE public.client_cards ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- One-time manual step (run once, after each staff member has signed in at least once via
-- /login so their client_profiles row exists): promote Élodie and Clément to their real role.
-- UPDATE public.client_profiles SET role = 'admin' WHERE email = 'elodie@example.com';
-- UPDATE public.client_profiles SET role = 'fournisseur' WHERE email = 'clement@example.com';
