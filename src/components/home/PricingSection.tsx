import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  sort_order: number;
}

export default function PricingSection() {
  const [cards, setCards] = useState<PricingCard[]>([]);

  useEffect(() => {
    supabase.from("pricing_cards").select("*").order("sort_order").then(({ data }) => {
      if (data) setCards(data as unknown as PricingCard[]);
    });
  }, []);

  if (cards.length === 0) return null;

  // Find the unit price card to compute savings
  const unitCard = cards.find(c => c.sessions === 1);
  const unitPrice = unitCard ? unitCard.price : null;

  return (
    <section className="py-20 bg-muted/40">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-dark mb-3">
            Nos Cartes de Cours
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Choisissez la formule qui correspond à votre rythme. Valables pour tous les cours Yoga & Pilates.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {cards.map((card, i) => {
            const perSession = card.sessions > 0 && card.sessions < 9999 ? card.price / card.sessions : null;
            const savingsPercent = unitPrice && perSession && card.sessions > 1
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

                {/* Per session price + savings */}
                {perSession !== null && (
                  <p className="text-xs text-muted-foreground mb-4">
                    {perSession.toFixed(2)}€ / cours
                    {savingsPercent && savingsPercent > 0 && (
                      <span className="ml-1.5 text-primary font-semibold">-{savingsPercent}%</span>
                    )}
                  </p>
                )}
                {card.sessions >= 9999 && (
                  <p className="text-xs text-muted-foreground mb-4">Accès illimité</p>
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

                <Link to="/yoga">
                  <Button
                    className={`w-full ${card.popular ? "bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90" : ""}`}
                    variant={card.popular ? "default" : "outline"}
                  >
                    Choisir
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
