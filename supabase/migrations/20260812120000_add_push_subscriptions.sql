-- Stocke les abonnements Web Push (notifications natives sur l'app installée sur l'écran
-- d'accueil) — un abonnement par appareil/navigateur, lié au compte connecté au moment de
-- l'activation. Utilisé par la edge function send-booking-notification pour notifier l'admin
-- (et potentiellement d'autres membres du staff plus tard) à chaque nouvelle réservation.

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Chacun ne gère que son propre abonnement ; le staff peut tout voir (utile pour un futur
-- écran de gestion), mais n'a pas besoin de le faire aujourd'hui — la edge function lit via
-- service_role et n'est donc pas concernée par ces policies.
CREATE POLICY "push_subscriptions_select_own_or_staff" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own_or_staff" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
