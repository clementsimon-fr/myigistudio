import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StripeCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
  description: string;
}

let stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

// Remplace l'ancien MockStripeModal : même props (open/onClose/onSuccess/amount/description),
// mais paiement réel via Stripe Checkout en mode "embedded" — la cliente ne quitte jamais
// myigistudio.vercel.app, le formulaire Stripe s'affiche directement dans ce Dialog.
export default function StripeCheckoutModal({ open, onClose, onSuccess, amount, description }: StripeCheckoutModalProps) {
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError(null);
      sessionIdRef.current = null;
      return;
    }
    let cancelled = false;
    setClientSecret(null);
    setError(null);
    supabase.functions
      .invoke("create-checkout-session", {
        body: { amount, description, returnUrl: window.location.href },
      })
      .then(({ data, error: fnError }) => {
        if (cancelled) return;
        if (fnError || !data?.client_secret) {
          setError(fnError?.message || "Impossible de créer la session de paiement.");
          return;
        }
        sessionIdRef.current = data.session_id;
        setClientSecret(data.client_secret);
      });
    return () => { cancelled = true; };
  }, [open, amount, description]);

  const options = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      onComplete: async () => {
        if (verifyingRef.current) return;
        verifyingRef.current = true;
        const sessionId = sessionIdRef.current;
        const { data } = await supabase.functions.invoke("verify-checkout-session", {
          body: { session_id: sessionId },
        });
        verifyingRef.current = false;
        if (data?.paid) {
          onSuccess();
        } else {
          toast({ title: "Paiement non confirmé", description: "Merci de réessayer.", variant: "destructive" });
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-primary-dark">Paiement — {amount.toFixed(2)} €</DialogTitle>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive py-8 text-center">{error}</p>
        )}
        {!error && !options && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {options && (
          <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
