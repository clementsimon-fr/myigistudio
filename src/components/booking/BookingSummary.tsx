import { useState } from "react";
import { Info, Sparkles, Star, ChevronDown, ChevronUp, Users, Clock, Euro, CalendarRange, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  inclusions?: string;
  longDescription?: string;
  shortDescription?: string;
  instructorName?: string;
  instructorPhoto?: string;
  cardYogaCount?: number;
  linkedDates?: string[];
}

export default function BookingSummary({
  activityName, date, time, endTime, duration, price, category, isYoga, pricingCards, onCreateAccount,
  inclusions, longDescription, shortDescription, instructorName, instructorPhoto, cardYogaCount, linkedDates,
}: BookingSummaryProps) {
  const [showFormulas, setShowFormulas] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  return (
    <>
      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Résumé de la réservation</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Activité</span>
          <span className="font-medium">{activityName}</span>
        </div>
        {shortDescription && (
          <p className="text-xs text-muted-foreground">{shortDescription}</p>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          {linkedDates && linkedDates.length > 1 ? (
            <div className="text-right">
              {[...new Set(linkedDates)].map(d => (
                <div key={d} className="font-medium">
                  {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                </div>
              ))}
            </div>
          ) : (
            <span className="font-medium">{date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
          )}
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
              {cardYogaCount && cardYogaCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ou {cardYogaCount} carte{cardYogaCount > 1 ? "s" : ""} yoga
                </span>
              )}
              {inclusions && (
                <span className="inline-flex items-center gap-0.5 text-xs font-normal text-primary cursor-help" title={inclusions}>
                  <Info className="h-3 w-3" />
                </span>
              )}
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
        {/* Inclusions detail */}
        {inclusions && (
          <div className="bg-emerald-50 rounded-md px-3 py-2 text-xs text-emerald-700 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{inclusions}</span>
          </div>
        )}

        {/* 2.3: More info button */}
        {(longDescription || instructorName) && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs font-medium"
              onClick={() => setShowMoreInfo(!showMoreInfo)}
            >
              {showMoreInfo ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showMoreInfo ? "Masquer les détails" : "Afficher plus d'informations"}
            </Button>
          </div>
        )}

        {showMoreInfo && (
          <div className="space-y-3 pt-2 border-t mt-2">
            {longDescription && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Description détaillée</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">{longDescription}</p>
              </div>
            )}
            {instructorName && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {instructorPhoto ? <AvatarImage src={instructorPhoto} alt={instructorName} /> : null}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{instructorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium">{instructorName}</p>
                  <p className="text-[10px] text-muted-foreground">Intervenant(e)</p>
                </div>
              </div>
            )}
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
