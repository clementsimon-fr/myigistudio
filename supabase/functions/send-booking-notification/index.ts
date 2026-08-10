import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingDate {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

interface Payload {
  client_email?: string | null;
  client_name: string;
  activity_name: string;
  dates: BookingDate[];
  participants_count: number;
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function datesListHtml(dates: BookingDate[]): string {
  return dates.map((d) => `${formatDateFR(d.date)} à ${d.time?.slice(0, 5)}`).join("<br>");
}

// Envoie un email transactionnel via l'API Brevo (ex-Sendinblue). Ne lève jamais — un échec
// d'envoi ne doit jamais faire échouer la réservation elle-même (déjà actée en base à ce stade).
async function sendBrevoEmail(apiKey: string, params: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}): Promise<{ ok: boolean; error?: string }> {
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "MyIgiStudio";
  if (!senderEmail) return { ok: false, error: "BREVO_SENDER_EMAIL non configuré" };
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Brevo ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload: Payload = await req.json();
    const { client_email, client_name, activity_name, dates, participants_count } = payload;
    if (!activity_name || !dates || dates.length === 0) {
      return new Response(JSON.stringify({ error: "Données de réservation incomplètes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      // Pas de clé configurée : on ne bloque rien côté client, on répond juste que
      // l'envoi n'a pas eu lieu (visible dans les logs de la fonction).
      return new Response(JSON.stringify({ client: { ok: false, error: "BREVO_API_KEY non configuré" }, admin: { ok: false, error: "BREVO_API_KEY non configuré" } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Adresse de notification admin : configurable depuis l'admin (Paramètres → site_settings,
    // clé "notification_email") sans avoir à redéployer quoi que ce soit. Repli sur l'adresse
    // de contact déjà affichée publiquement sur le site si rien n'est configuré.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: settingRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "notification_email")
      .maybeSingle();
    const adminEmail = settingRow?.value?.trim() || "igistudiofr@gmail.com";

    const datesHtml = datesListHtml(dates);
    const participantsLabel = participants_count > 1 ? `${participants_count} personnes` : "1 personne";

    const results: { client?: { ok: boolean; error?: string }; admin: { ok: boolean; error?: string } } = {
      admin: { ok: false },
    };

    if (client_email) {
      results.client = await sendBrevoEmail(apiKey, {
        to: [{ email: client_email, name: client_name }],
        subject: `Réservation confirmée — ${activity_name}`,
        htmlContent: `
          <div style="font-family: sans-serif; line-height: 1.6;">
            <h2>Réservation confirmée ✓</h2>
            <p>Bonjour ${client_name},</p>
            <p>Votre réservation est bien enregistrée :</p>
            <p><strong>${activity_name}</strong><br>${datesHtml}<br>${participantsLabel}</p>
            <p>À très bientôt au studio !</p>
            <p style="color:#888; font-size: 12px;">MyIgiStudio</p>
          </div>
        `,
      });
    }

    results.admin = await sendBrevoEmail(apiKey, {
      to: [{ email: adminEmail }],
      subject: `Nouvelle réservation — ${activity_name}`,
      htmlContent: `
        <div style="font-family: sans-serif; line-height: 1.6;">
          <h2>Nouvelle réservation</h2>
          <p><strong>${client_name}</strong>${client_email ? ` (${client_email})` : ""}</p>
          <p><strong>${activity_name}</strong><br>${datesHtml}<br>${participantsLabel}</p>
        </div>
      `,
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
