import { Sparkles } from "lucide-react";

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
 *
 * Une seule ligne visuelle par formule : nom + validité à gauche, prix + nombre de
 * cours à droite. Pas de badges superposés (Gratuit / -X% / Populaire) qui parlaient
 * chacun d'une chose différente — la formule mise en avant se distingue juste par un
 * cadre plus marqué, pas par du texte en plus.
 */
export default function YogaFormulasBlock({
  pricingCards,
  onSelectCard,
  showHeader = true,
}: YogaFormulasBlockProps) {
  const unitCards = pricingCards.filter((c) => c.sessions === 1);
  const multiCards = pricingCards.filter((c) => c.sessions > 1);

  const sessionsLabel = (card: YogaFormulasPricingCard) =>
    card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`;

  const FormulaRow = ({ card }: { card: YogaFormulasPricingCard }) => (
    <button
      type="button"
      onClick={() => onSelectCard?.(card)}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm hover:bg-muted/40 ${
        card.popular ? "border-primary/50 bg-primary/5" : "bg-background"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {card.sessions === 1 ? "Carte Yoga à l'unité" : `Cartes Yoga "${card.name}"`}
        </p>
        <p className="text-xs text-muted-foreground">{card.validity}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{card.price} €</p>
        <p className="text-[11px] text-muted-foreground">{sessionsLabel(card)}</p>
      </div>
    </button>
  );

  return (
    <div className="space-y-3">
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

      {unitCards.map((card) => <FormulaRow key={card.id} card={card} />)}

      {multiCards.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm font-display font-semibold text-muted-foreground">Ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      <div className="space-y-2">
        {multiCards.map((card) => <FormulaRow key={card.id} card={card} />)}
      </div>
    </div>
  );
}
