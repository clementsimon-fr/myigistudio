import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Info, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  payment_info: string;
}

interface FormulaInfoModalProps {
  open: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onContinueWithout: () => void;
  onSelectCard?: (card: PricingCard) => void;
  pricingCards: PricingCard[];
  unitPrice?: number;
  isConnected?: boolean;
}

export default function FormulaInfoModal({ open, onClose, onCreateAccount, onContinueWithout, pricingCards, unitPrice }: FormulaInfoModalProps) {
  const infoRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top of popup when it opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        dialogContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  }, [open]);

  const unitCards = pricingCards.filter(c => c.sessions === 1);
  const multiCards = pricingCards.filter(c => c.sessions > 1);

  // Scroll to bottom (info/create account) when a multi-card is clicked
  const handleMultiCardClick = () => {
    setTimeout(() => {
      infoRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <Sparkles className="h-5 w-5" /> Formules Cartes Yoga
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vous pouvez acheter un cours à l'unité ou acheter plusieurs cartes de yoga utilisables quand vous le souhaitez pendant la durée de validité.
          </p>

          {/* Unit card with green bg */}
          {unitCards.map(card => (
            <div key={card.id} className="rounded-lg border p-4 relative bg-emerald-50/60 border-emerald-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">Carte Yoga à l'unité</p>
                  <p className="text-xs text-muted-foreground">{card.validity}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{card.price} €</p>
                  <Badge variant="secondary" className="text-sm font-bold px-2.5 py-0.5">1 cours</Badge>
                </div>
              </div>
            </div>
          ))}

          {/* Separator */}
          {multiCards.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm font-display font-semibold text-muted-foreground">Ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Multi cards */}
          <div className="grid gap-3">
            {multiCards.map(card => (
              <div key={card.id} className="rounded-lg border p-4 relative cursor-pointer hover:shadow-md transition-all" onClick={handleMultiCardClick}>
                {card.popular && (
                  <div className="absolute -top-2.5 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" /> Populaire
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-primary-dark">Cartes Yoga "{card.name}"</p>
                    <p className="text-xs text-muted-foreground">{card.validity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{card.price} €</p>
                    <Badge variant="secondary" className="text-sm font-bold px-2.5 py-0.5">
                      {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div ref={infoRef} className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Vous devez créer un compte pour acheter ou utiliser une formule de cartes.
            </p>
          </div>

          <div className="grid gap-2">
            <Button onClick={onCreateAccount} className="w-full">Créer un compte</Button>
            <Button variant="ghost" onClick={onContinueWithout} className="w-full text-muted-foreground">
              Continuer sans formule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
