import { Info, Sparkles, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
}

export default function BookingSummary({ activityName, date, time, endTime, duration, price, category, isYoga, pricingCards }: BookingSummaryProps) {
  return (
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
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline">
                    ou 1 carte <Info className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-display font-semibold text-primary-dark text-sm">
                      <Sparkles className="h-4 w-4" /> Formules Cartes Yoga
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Les cartes yoga vous permettent de réserver vos cours à un tarif avantageux. Achetez une carte, et utilisez vos cours quand vous le souhaitez.
                    </p>
                    <div className="space-y-2">
                      {pricingCards.map(card => (
                        <div key={card.id} className="rounded-md border p-2.5 relative">
                          {card.popular && (
                            <div className="absolute -top-2 right-2 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Star className="h-2 w-2" /> Populaire
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-primary-dark text-xs">{card.name}</p>
                              <p className="text-[10px] text-muted-foreground">{card.validity}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm">{card.price} €</p>
                              <p className="text-xs font-semibold text-primary">
                                {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Créez un compte pour acheter ou utiliser une carte.</p>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
