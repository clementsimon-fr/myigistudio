import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Loader2 } from "lucide-react";

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
  mode: string; // e.g. "1 carte yoga utilisée", "cours à l'unité", "formule 5 cartes", "bon cadeau"
  amount: number;
  conditions: ConditionRow[];
  conditionsAccepted: boolean;
  onConditionsChange: (v: boolean) => void;
  onPay: () => void;
  submitting: boolean;
}

export default function PaymentSummary({
  activityName, date, time, endTime, mode, amount,
  conditions, conditionsAccepted, onConditionsChange, onPay, submitting,
}: PaymentSummaryProps) {
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
        <div className="flex justify-between border-t pt-2 mt-1">
          <span className="text-muted-foreground">Mode</span>
          <span className="font-medium text-primary-dark">{mode}</span>
        </div>
        {amount > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Montant</span>
            <span className="font-bold text-lg">{amount.toFixed(2)} €</span>
          </div>
        )}
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
              onCheckedChange={(v) => onConditionsChange(!!v)}
            />
            <label htmlFor="pay-conditions" className="text-xs text-muted-foreground cursor-pointer leading-tight">
              J'ai lu et j'accepte les conditions ci-dessus
            </label>
          </div>
        </div>
      )}

      <Button
        onClick={onPay}
        disabled={submitting || (conditions.length > 0 && !conditionsAccepted)}
        className="w-full h-11 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-2 text-base font-semibold"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        {amount > 0 ? `Payer ${amount.toFixed(2)} €` : "Confirmer"}
      </Button>
    </div>
  );
}
