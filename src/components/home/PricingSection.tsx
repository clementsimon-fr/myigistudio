import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  sort_order: number;
  payment_info: string;
}

export default function PricingSection() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<PricingCard[]>([]);
  const [pricingNotes, setPricingNotes] = useState("");
  const [discoverCard, setDiscoverCard] = useState<PricingCard | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("pricing_cards").select("*").order("sort_order"),
      supabase.from("site_settings").select("*").eq("key", "pricing_notes").single(),
    ]).then(([cardsRes, notesRes]) => {
      if (cardsRes.data) setCards(cardsRes.data as unknown as PricingCard[]);
      if (notesRes.data) setPricingNotes((notesRes.data as any).value || "");
    });
  }, []);

  if (cards.length === 0) return null;

  const unitCard = cards.find(c => c.sessions === 1);
  const unitPrice = unitCard ? unitCard.price : null;

  return (
    <section className="py-20 bg-muted/40">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-dark mb-3">
            Nos cartes de cours de Yoga
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Choisissez la formule qui correspond à votre rythme. Valables pour tous les cours Yoga & Pilates.
            Achetez une carte, ou plusieurs, et utilisez vos cours quand vous le souhaitez.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {cards.map((card, i) => {
            const perSession = card.sessions > 0 && card.sessions < 9999 ? card.price / card.sessions : null;
            const discount = unitPrice && perSession && card.sessions > 1
              ? Math.round((1 - perSession / unitPrice) * 100)
              : null;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative rounded-xl border p-6 bg-card flex flex-col ${
                  card.popular
                    ? "border-primary-dark shadow-lg ring-2 ring-primary-dark/20"
                    : "hover:shadow-md transition-shadow"
                }`}
              >
                {card.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" /> Populaire
                  </div>
                )}

                <h3 className="font-display font-semibold text-lg text-primary-dark">{card.name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-bold text-foreground">{card.price}€</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`} · {card.validity}
                </p>

                {perSession !== null && (
                  <p className="text-xs text-muted-foreground mb-1">
                    {perSession.toFixed(2)}€ / cours
                  </p>
                )}
                {card.sessions >= 9999 && (
                  <p className="text-xs text-muted-foreground mb-1">Accès illimité</p>
                )}

                {card.payment_info && (
                  <p className="text-xs text-primary italic mb-3">{card.payment_info}</p>
                )}

                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    Tous cours Yoga & Pilates
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    Réservation en ligne
                  </li>
                  {card.sessions >= 10 && (
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      Annulation gratuite 24h
                    </li>
                  )}
                </ul>

                <Button
                  className={`w-full ${card.popular ? "bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90" : ""}`}
                  variant={card.popular ? "default" : "outline"}
                  onClick={() => setDiscoverCard(card)}
                >
                  Découvrir
                </Button>
              </motion.div>
            );
          })}
        </div>

        {pricingNotes && (
          <div className="max-w-2xl mx-auto mt-8 text-center">
            <div className="flex items-start gap-2 justify-center text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-left space-y-1">
                {pricingNotes.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discover dialog */}
      <Dialog open={!!discoverCard} onOpenChange={(open) => !open && setDiscoverCard(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">{discoverCard?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour prendre une formule, vous devez avoir un compte ; ou choisir la formule au moment de la réservation.
            </p>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => { setDiscoverCard(null); navigate("/login"); }}>
                Connexion
              </Button>
              <Button variant="outline" className="w-full" onClick={() => { setDiscoverCard(null); navigate("/?view=planning&filter=yoga"); }}>
                Réserver une séance
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
