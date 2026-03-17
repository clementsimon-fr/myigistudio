import { useState } from "react";
import { Info, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import FormulaInfoModal from "./FormulaInfoModal";

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  payment_info: string;
}

interface BookingSummaryProps {
  activityName: string;
  date: Date;
  time: string;
  endTime: string;
  duration: string;
  price?: number;
  category?: string;
  isYoga?: boolean;
  pricingCards?: PricingCard[];
  onCreateAccount?: () => void;
}

export default function BookingSummary({ activityName, date, time, endTime, duration, price, category, isYoga, pricingCards, onCreateAccount }: BookingSummaryProps) {
  const [showFormulas, setShowFormulas] = useState(false);

  return (
    <>
      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Résumé de la réservation</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Activité</span>
          <span className="font-medium">{activityName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">{date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Horaire</span>
          <span className="font-medium">{time} - {endTime}</span>
        </div>
        {duration && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Durée</span>
            <span className="font-medium">{duration}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lieu</span>
          <span className="font-medium">Studio MyIgi</span>
        </div>
        {price != null && (
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="text-muted-foreground">Prix unitaire</span>
            <span className="font-semibold text-primary-dark flex items-center gap-1.5">
              {price} €
              {isYoga && pricingCards && pricingCards.length > 0 && (
                <button
                  className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"
                  onClick={() => setShowFormulas(true)}
                >
                  ou 1 carte <Info className="h-3 w-3" />
                </button>
              )}
            </span>
          </div>
        )}
      </div>

      {isYoga && pricingCards && pricingCards.length > 0 && (
        <FormulaInfoModal
          open={showFormulas}
          onClose={() => setShowFormulas(false)}
          onCreateAccount={onCreateAccount || (() => setShowFormulas(false))}
          onContinueWithout={() => setShowFormulas(false)}
          pricingCards={pricingCards}
        />
      )}
    </>
  );
}
