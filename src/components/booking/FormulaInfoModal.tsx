import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Star, Info } from "lucide-react";
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
  pricingCards: PricingCard[];
  unitPrice?: number;
}

export default function FormulaInfoModal({ open, onClose, onCreateAccount, onContinueWithout, pricingCards, unitPrice }: FormulaInfoModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <Sparkles className="h-5 w-5" /> Formules Cartes Yoga
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Intro paragraph */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les cartes yoga vous permettent de réserver vos cours à un tarif avantageux.
            Achetez une carte, ou plusieurs, et utilisez vos cours quand vous le souhaitez pendant la durée de validité.
          </p>

          <div className="grid gap-3">
            {pricingCards.map(card => {
              const perSession = card.sessions < 9999 && card.sessions > 0 ? card.price / card.sessions : null;
              const reductionPercent = perSession && unitPrice && unitPrice > 0
                ? Math.round((1 - perSession / unitPrice) * 100)
                : null;

              return (
                <div key={card.id} className="rounded-lg border p-4 relative">
                  {card.popular && (
                    <div className="absolute -top-2.5 right-3 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5" /> Populaire
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-primary-dark">{card.name}</p>
                      <p className="text-xs text-muted-foreground">{card.validity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{card.price} €</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Badge variant="secondary" className="text-sm font-bold px-2.5 py-0.5">
                          {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`}
                        </Badge>
                        {reductionPercent != null && reductionPercent > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-xs font-bold">
                            -{reductionPercent}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
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
