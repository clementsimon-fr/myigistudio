
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_sms boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reminder_email boolean NOT NULL DEFAULT true;
