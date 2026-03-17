import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2, Info, CreditCard, Gift } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConditionRow {
  id: string;
  title: string;
  content: string;
}

interface PaymentSummaryProps {
  activityName: string;
  date: Date;
  time: string;
  endTime: string;
  mode: string;
  amount: number;
  conditions: ConditionRow[];
  conditionsAccepted: boolean;
  onConditionsChange: (v: boolean) => void;
  onPay: () => void;
  submitting: boolean;
  // Formula detail props
  cardName?: string;
  cardSessions?: number;
  existingCredits?: number;
}

function getModeIcon(mode: string) {
  if (mode.includes("carte")) return <CreditCard className="h-3.5 w-3.5" />;
  if (mode.includes("cadeau") || mode.includes("Bon")) return <Gift className="h-3.5 w-3.5" />;
  return <ShoppingCart className="h-3.5 w-3.5" />;
}

export default function PaymentSummary({
  activityName, date, time, endTime, mode, amount,
  conditions, conditionsAccepted, onConditionsChange, onPay, submitting,
  cardName, cardSessions, existingCredits,
}: PaymentSummaryProps) {
  const [showConditionError, setShowConditionError] = useState(false);

  const isFormulaMode = !!cardName && !!cardSessions;
  const totalAfter = isFormulaMode
    ? (existingCredits || 0) + cardSessions - 1
    : undefined;

  const handlePayClick = () => {
    if (conditions.length > 0 && !conditionsAccepted) {
      setShowConditionError(true);
      return;
    }
    onPay();
  };

  const handleConditionsChange = (v: boolean) => {
    onConditionsChange(v);
    if (v) setShowConditionError(false);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-display font-semibold text-primary-dark">Récapitulatif</h2>

      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
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

        {/* Mode chosen */}
        <div className="flex justify-between border-t pt-2 mt-1">
          <span className="text-muted-foreground">
            {isFormulaMode ? "Achat" : "Mode"}
          </span>
          <span className="font-medium text-primary-dark">
            {isFormulaMode ? `Formule ${cardName}` : mode}
          </span>
        </div>

        {/* Formula detail */}
        {isFormulaMode && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inclut</span>
              <span className="font-semibold">{cardSessions} cours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Réservation {activityName}</span>
              <span className="font-medium">consomme 1 cours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground flex items-center gap-1">
                Solde après réservation
                {existingCredits != null && existingCredits > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Achat de {cardSessions} cours + {existingCredits} cours disponibles − 1 cours pour réservation = {totalAfter} cours disponibles
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </span>
              <span className="font-bold text-primary-dark">{totalAfter} cours</span>
            </div>
          </>
        )}

        {amount > 0 && (
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-bold text-lg">{amount.toFixed(0)} €</span>
          </div>
        )}
      </div>

      {/* Option de réservation choisie - visual reminder */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2.5">
        {getModeIcon(mode)}
        <div>
          <p className="text-xs font-semibold text-primary-dark">
            {isFormulaMode ? `Achat : Formule ${cardName}` : mode}
          </p>
          {isFormulaMode && (
            <p className="text-[11px] text-muted-foreground">
              {cardSessions} cours inclus · Réservation {activityName} incluse
            </p>
          )}
        </div>
      </div>

      {conditions.length > 0 && (
        <div className="space-y-3">
          <Accordion type="multiple" className="w-full">
            {conditions.map(c => (
              <AccordionItem key={c.id} value={c.id} className="border rounded-lg bg-muted/30 px-3">
                <AccordionTrigger className="py-2 text-xs font-semibold text-primary-dark hover:no-underline">
                  {c.title}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{c.content}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="flex items-start gap-2">
            <Checkbox
              id="pay-conditions"
              checked={conditionsAccepted}
              onCheckedChange={(v) => handleConditionsChange(!!v)}
              className={showConditionError && !conditionsAccepted ? "border-destructive" : ""}
            />
            <label
              htmlFor="pay-conditions"
              className={`text-xs cursor-pointer leading-tight ${
                showConditionError && !conditionsAccepted ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              J'ai lu et j'accepte les conditions ci-dessus
            </label>
          </div>
        </div>
      )}

      <Button
        onClick={handlePayClick}
        disabled={submitting}
        className="w-full h-11 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-2 text-base font-semibold"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        {amount > 0 ? `Payer ${amount.toFixed(0)} €` : "Confirmer"}
      </Button>
    </div>
  );
}
