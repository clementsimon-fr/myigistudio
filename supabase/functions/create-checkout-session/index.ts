import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  amount: number; // euros
  description: string;
  returnUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { amount, description, returnUrl }: Payload = await req.json();
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Montant invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: description || "MyIgiStudio" },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      return_url: returnUrl,
      // Sans ce champ, Stripe redirige TOUJOURS la page entière vers return_url après paiement
      // (valeur par défaut "always"), et l'appli n'ayant aucun code pour gérer ce retour, la
      // page se recharge silencieusement sans jamais appeler onComplete côté client — donc sans
      // jamais écrire la réservation en base. "if_required" ne redirige que si le moyen de
      // paiement l'exige (ex. certains virements) ; une carte bancaire reste dans la modale
      // embarquée et déclenche onComplete normalement. Cause racine du bug du 12/08/2026.
      redirect_on_completion: "if_required",
    });

    return new Response(JSON.stringify({ client_secret: session.client_secret, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
