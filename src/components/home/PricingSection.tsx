import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { pricingCards } from "@/data/mockData";

export default function PricingSection() {
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {pricingCards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
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
              <p className="text-sm text-muted-foreground mb-4">
                {typeof card.sessions === "number" ? `${card.sessions} cours` : card.sessions} · {card.validity}
              </p>

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Tous cours Yoga & Pilates
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  Réservation en ligne
                </li>
                {typeof card.sessions === "number" && card.sessions >= 10 && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    Annulation gratuite 24h
                  </li>
                )}
              </ul>

              <Link to="/reserver">
                <Button
                  className={`w-full ${
                    card.popular
                      ? "bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90"
                      : ""
                  }`}
                  variant={card.popular ? "default" : "outline"}
                >
                  Choisir
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
