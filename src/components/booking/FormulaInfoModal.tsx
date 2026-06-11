import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Info } from "lucide-react";
import YogaFormulasBlock, { YogaFormulasPricingCard } from "@/components/YogaFormulasBlock";

interface PricingCard extends YogaFormulasPricingCard {
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

export default function FormulaInfoModal({ open, onClose, onCreateAccount, onContinueWithout, onSelectCard, pricingCards, isConnected }: FormulaInfoModalProps) {
  const infoRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        dialogContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  }, [open]);

  const handleSelect = (card: YogaFormulasPricingCard) => {
    const full = pricingCards.find((c) => c.id === card.id);
    if (!full) return;
    if (isConnected && onSelectCard) {
      onSelectCard(full);
      onClose();
      return;
    }
    if (full.sessions > 1) {
      setTimeout(() => infoRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <Sparkles className="h-5 w-5" /> Formules Cartes Yoga
          </DialogTitle>
        </DialogHeader>

        <div className="pt-2">
          <YogaFormulasBlock pricingCards={pricingCards} onSelectCard={handleSelect} showHeader={false} />

          {!isConnected ? (
            <div className="space-y-4 mt-5">
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
          ) : (
            <div ref={infoRef} className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2 mt-5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-primary-dark">
                Cliquez sur une formule pour l'ajouter à votre commande.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
