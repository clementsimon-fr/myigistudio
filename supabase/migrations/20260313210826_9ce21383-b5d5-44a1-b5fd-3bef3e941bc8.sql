
-- Profiles table for client bios and community visibility
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  show_in_community boolean NOT NULL DEFAULT false,
  avatar_url text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

-- Community forum
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to forum_posts" ON public.forum_posts FOR ALL TO public USING (true) WITH CHECK (true);

-- Gift vouchers
CREATE TABLE public.gift_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'amount',
  amount numeric NOT NULL DEFAULT 0,
  card_name text NOT NULL DEFAULT '',
  sessions integer NOT NULL DEFAULT 0,
  beneficiary_name text NOT NULL DEFAULT '',
  buyer_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  used boolean NOT NULL DEFAULT false,
  used_at timestamp with time zone,
  expires_at date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to gift_vouchers" ON public.gift_vouchers FOR ALL TO public USING (true) WITH CHECK (true);
