import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, first_name, last_name, phone, password }: Payload = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Reservation confirmed at payment time: the account must exist immediately,
    // the client should not have to click an email link mid-checkout to finish booking.
    let userId: string;
    // Only returned when we just created the account, so the client can sign itself in
    // immediately after and stay authenticated for any further bookings in the same visit.
    let signInPassword: string | undefined;
    const { data: existing } = await admin
      .from("client_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      userId = existing.id;
    } else {
      // A password is always set server-side (client-chosen one in "mode test", otherwise a
      // random one) so the browser can sign in right after account creation without asking
      // the client to invent a password they don't need — "mot de passe oublié" covers later access.
      const effectivePassword = password || crypto.randomUUID();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: effectivePassword,
        user_metadata: { first_name: first_name || "", last_name: last_name || "" },
      });
      if (createError || !created.user) {
        return new Response(JSON.stringify({ error: createError?.message || "Création du compte impossible" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created.user.id;
      signInPassword = effectivePassword;
      if (phone) {
        await admin.from("client_profiles").update({ phone }).eq("id", userId);
      }
    }

    return new Response(JSON.stringify({ user_id: userId, password: signInPassword }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
