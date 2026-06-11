import { Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface YogaFormulasPricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular?: boolean;
  payment_info?: string;
  sort_order?: number;
}

interface YogaFormulasBlockProps {
  pricingCards: YogaFormulasPricingCard[];
  onSelectCard?: (card: YogaFormulasPricingCard) => void;
  showHeader?: boolean;
}

/**
 * Bloc canonique "Formules Cartes Yoga".
 * À utiliser partout dans l'application dès qu'on affiche les formules.
 * Affiche la carte à l'unité (fond vert) + les cartes multiples avec un badge % d'économie.
 */
export default function YogaFormulasBlock({
  pricingCards,
  onSelectCard,
  showHeader = true,
}: YogaFormulasBlockProps) {
  const unitCards = pricingCards.filter((c) => c.sessions === 1);
  const multiCards = pricingCards.filter((c) => c.sessions > 1);
  const unitPrice = unitCards[0]?.price ?? null;

  const discount = (card: YogaFormulasPricingCard) => {
    if (!unitPrice || card.sessions <= 1 || card.sessions >= 9999) return null;
    const perSession = card.price / card.sessions;
    const pct = Math.round((1 - perSession / unitPrice) * 100);
    return pct > 0 ? pct : null;
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <div>
          <h3 className="flex items-center gap-2 font-display font-semibold text-primary-dark text-lg">
            <Sparkles className="h-5 w-5" /> Formules Cartes Yoga
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            Vous pouvez acheter un cours à l'unité ou acheter plusieurs cartes de yoga utilisables
            quand vous le souhaitez pendant la durée de validité.
          </p>
        </div>
      )}

      {/* Unit card */}
      {unitCards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onSelectCard?.(card)}
          className="w-full text-left rounded-lg border p-4 relative bg-emerald-50/60 border-emerald-200 hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-foreground">Carte Yoga à l'unité</p>
              <p className="text-xs text-muted-foreground">{card.validity}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{card.price} €</p>
              <Badge variant="secondary" className="text-sm font-bold px-2.5 py-0.5">
                1 cours
              </Badge>
            </div>
          </div>
        </button>
      ))}

      {multiCards.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm font-display font-semibold text-muted-foreground">Ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      <div className="grid gap-3">
        {multiCards.map((card) => {
          const pct = discount(card);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectCard?.(card)}
              className="w-full text-left rounded-lg border p-4 relative cursor-pointer hover:shadow-md transition-all"
            >
              {card.popular && (
                <div className="absolute -top-2.5 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" /> Populaire
                </div>
              )}
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-primary-dark">Cartes Yoga "{card.name}"</p>
                  <p className="text-xs text-muted-foreground">{card.validity}</p>
                  {pct !== null && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      -{pct}%
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{card.price} €</p>
                  <Badge variant="secondary" className="text-sm font-bold px-2.5 py-0.5">
                    {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`}
                  </Badge>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
