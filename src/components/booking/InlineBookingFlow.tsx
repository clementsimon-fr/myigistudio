import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Gift, Info, CalendarDays, Users, Euro, CreditCard } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MockStripeModal from "@/components/demo/MockStripeModal";
import FormulaInfoModal from "@/components/booking/FormulaInfoModal";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

const DAY_INDEX: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

function nextDatesForCourse(schedules: Schedule[], count = 8): { date: string; time: string; end_time: string; scheduleId: string }[] {
  const out: { date: string; time: string; end_time: string; scheduleId: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && out.length < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    for (const s of schedules) {
      const idx = DAY_INDEX[(s.day || "").toLowerCase()];
      if (idx === dow) {
        out.push({
          date: d.toISOString().split("T")[0],
          time: s.time,
          end_time: s.end_time,
          scheduleId: s.id,
        });
      }
    }
  }
  return out;
}

interface InlineBookingFlowProps {
  course?: Course | null;
  workshop?: Workshop | null;
  schedules?: Schedule[];
  workshopsList?: Workshop[];
  unitPrice?: number | null;
  onDone?: () => void;
}

export default function InlineBookingFlow({ course, workshop, schedules = [], workshopsList = [], unitPrice, onDone }: InlineBookingFlowProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProfile, addReservation, useCredit, addNotification } = useDemoContext();

  const isYoga = !!course;
  const dates = useMemo(() => {
    if (workshop) {
      return workshopsList
        .filter((w) => w.name === workshop.name && new Date(w.date) >= new Date(new Date().toDateString()))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((w) => ({ date: w.date, time: w.time, end_time: w.end_time, scheduleId: w.id, price: w.price }));
    }
    if (course) {
      return nextDatesForCourse(schedules);
    }
    return [];
  }, [course, workshop, schedules, workshopsList]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pricingCards, setPricingCards] = useState<any[]>([]);

  useEffect(() => {
    if (!isYoga) return;
    supabase.from("pricing_cards").select("*").order("sort_order").then(({ data }) => {
      if (data) setPricingCards(data as any[]);
    });
  }, [isYoga]);
  const selected = dates[selectedIdx];
  const [participants, setParticipants] = useState(1);
  const [showStripe, setShowStripe] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);

  const pricePerUnit = isYoga ? unitPrice ?? 0 : (workshop?.price ?? 0);
  const total = pricePerUnit * participants;
  const cardsNeeded = isYoga ? participants : 0;

  const finalizeReservation = async () => {
    if (!selected) return;
    const name = course?.name || workshop?.name || "";
    addReservation(name, selected.date, selected.time);
    addNotification(`${currentProfile?.name || "Un client"} a réservé ${name}`, "reservation");
    // Best-effort persist
    await supabase.from("reservations").insert({
      client_name: currentProfile?.name || "Invité",
      activity_name: name,
      activity_type: course ? "course" : "workshop",
      date: selected.date,
      time: selected.time,
      end_time: selected.end_time,
      participants,
      status: "confirmé",
      course_id: course?.id || null,
      workshop_id: workshop?.id || null,
    } as any);
    toast({ title: "Réservation confirmée ✓", description: `${name} — ${new Date(selected.date).toLocaleDateString("fr-FR")} à ${selected.time}` });
    onDone?.();
  };

  const handleCommander = () => {
    if (!currentProfile) {
      navigate("/register?returnTo=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (isYoga && (currentProfile.credits || 0) >= cardsNeeded) {
      // Use cards directly
      for (let i = 0; i < cardsNeeded; i++) useCredit();
      finalizeReservation();
    } else {
      setShowStripe(true);
    }
  };

  const handleStripeSuccess = () => {
    setShowStripe(false);
    finalizeReservation();
  };

  const handleVoucher = () => {
    toast({ title: "Bon cadeau", description: "Saisissez votre code dans l'espace client." });
  };

  if (dates.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
        Aucune date disponible pour le moment.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 md:p-5 space-y-5">
      <h3 className="font-display text-lg font-semibold text-primary-dark">Réserver</h3>

      {/* 1. Date */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark mb-2">
          <CalendarDays className="h-3.5 w-3.5" /> 1. Choisissez votre date
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {dates.map((d, i) => {
            const dt = new Date(d.date + "T12:00:00");
            const lbl = dt.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
            return (
              <button
                key={`${d.scheduleId}-${d.date}`}
                onClick={() => setSelectedIdx(i)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs ${i === selectedIdx ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
              >
                <div className="font-medium capitalize">{lbl}</div>
                <div className="text-[10px] opacity-80">{d.time?.slice(0, 5)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Participants */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark mb-2">
          <Users className="h-3.5 w-3.5" /> 2. Participants
        </div>
        <div className="inline-flex items-center gap-3 rounded-lg border bg-background p-1.5">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setParticipants((p) => Math.max(1, p - 1))} disabled={participants <= 1}>
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-semibold min-w-[20px] text-center">{participants}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setParticipants((p) => p + 1)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 3. Tarif */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark mb-2">
          <Euro className="h-3.5 w-3.5" /> 3. Tarif
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          {isYoga ? (
            <span>
              <strong>{cardsNeeded} carte{cardsNeeded > 1 ? "s" : ""} Yoga</strong> soit <strong>{total} €</strong> unité
            </span>
          ) : (
            <span><strong>{total} €</strong> ({pricePerUnit} € × {participants})</span>
          )}
        </div>
      </div>

      {/* 4. Mode de paiement */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-dark mb-2">
          <CreditCard className="h-3.5 w-3.5" /> 4. Mode de paiement
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-1.5" onClick={handleCommander}>
            <ShoppingCart className="h-4 w-4" /> Commander
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handleVoucher}>
            <Gift className="h-4 w-4" /> Utiliser un bon cadeau
          </Button>
          {isYoga && (
            <Button variant="outline" className="gap-1.5" onClick={() => setShowFormulas(true)}>
              <Info className="h-4 w-4" /> Découvrir les formules
            </Button>
          )}
        </div>
      </div>

      <MockStripeModal
        open={showStripe}
        onClose={() => setShowStripe(false)}
        onSuccess={handleStripeSuccess}
        amount={total}
        description={`${course?.name || workshop?.name} — MyIgiStudio`}
      />

      <FormulaInfoModal open={showFormulas} onClose={() => setShowFormulas(false)} />
    </div>
  );
}
