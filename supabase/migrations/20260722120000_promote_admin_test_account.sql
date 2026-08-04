-- Promote the "ADMIN" test account (login identifier ADMIN, synthetic email
-- admin@test.myigistudio.local) created via create-guest-account to the admin role.
UPDATE public.client_profiles SET role = 'admin' WHERE email = 'admin@test.myigistudio.local';
