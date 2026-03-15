import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, Clock, Users, Loader2, AlertTriangle, Gift, CreditCard, ShoppingCart } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDemoContext } from "@/contexts/DemoContext";
import MockStripeModal from "@/components/demo/MockStripeModal";

interface ConditionRow {
  id: string;
  type: string;
  title: string;
  content: string;
  applies_to: string[];
  active: boolean;
}

interface CourseScheduleRow {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface AvailableSlot {
  id: string;
  name: string;
  time: string;
  end_time: string;
  duration: string;
  instructor: string;
  spots: number;
  spotsLeft: number;
  type: "course" | "workshop";
  sourceId: string;
  scheduleId?: string;
  price?: number;
}

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return "";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

const DAY_NAMES_MAP: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

const CARD_OPTIONS = [
  { sessions: 1, price: 18, label: "1 cours" },
  { sessions: 5, price: 70, label: "Carte 5 cours" },
  { sessions: 10, price: 130, label: "Carte 10 cours" },
];

type BookingStep = "select" | "credits" | "confirm";

export default function Reserver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProfile, createTempProfile, addCredits, useCredit, addReservation, addNotification } = useDemoContext();

  const activityType = searchParams.get("type") as "course" | "workshop" | null;
  const activityId = searchParams.get("id");
  const preselectedDate = searchParams.get("date");
  const preselectedScheduleId = searchParams.get("scheduleId");

  const [activity, setActivity] = useState<any>(null);
  const [schedules, setSchedules] = useState<CourseScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [directBooking, setDirectBooking] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [participants, setParticipants] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [bookingBlocked, setBookingBlocked] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "valid" | "invalid" | "checking">("idle");

  // Demo state
  const [bookingStep, setBookingStep] = useState<BookingStep>("select");
  const [selectedCard, setSelectedCard] = useState<typeof CARD_OPTIONS[0] | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeDescription, setStripeDescription] = useState("");
  const [paymentPurpose, setPaymentPurpose] = useState<"card" | "workshop">("card");

  useEffect(() => {
    if (!activityType || !activityId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      if (activityType === "course") {
        const [courseRes, schedRes] = await Promise.all([
          supabase.from("courses").select("*").eq("id", activityId).single(),
          supabase.from("course_schedules").select("*").eq("course_id", activityId),
        ]);
        if (courseRes.data) setActivity({ ...courseRes.data, type: "course" });
        if (schedRes.data) {
          const scheds = schedRes.data as unknown as CourseScheduleRow[];
          setSchedules(scheds);
          if (preselectedDate && preselectedScheduleId) {
            const d = new Date(preselectedDate + "T00:00:00");
            setSelectedDate(d);
            setSelectedSlot(preselectedScheduleId);
            setDirectBooking(true);
          }
        }
      } else {
        const res = await supabase.from("workshops").select("*").eq("id", activityId).single();
        if (res.data) {
          setActivity({ ...res.data, type: "workshop" });
          if (preselectedDate) {
            const d = new Date(preselectedDate + "T00:00:00");
            setSelectedDate(d);
            setSelectedSlot(res.data.id);
            setDirectBooking(true);
          }
        }
      }
      const { data: condData } = await supabase
        .from("conditions")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (condData) setConditions(condData as unknown as ConditionRow[]);
      setLoading(false);
    };
    load();
  }, [activityType, activityId, preselectedDate, preselectedScheduleId]);

  const availableDays = useMemo(() => {
    if (!activity || activity.type !== "course") return new Set<string>();
    return new Set(schedules.filter(s => s.spots_left > 0).map(s => s.day));
  }, [activity, schedules]);

  const workshopDates = useMemo(() => {
    if (!activity || activity.type !== "workshop") return new Set<string>();
    const today = new Date().toISOString().split("T")[0];
    if (activity.date < today || activity.spots_left <= 0) return new Set<string>();
    return new Set([activity.date]);
  }, [activity]);

  const isDateDisabled = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (!activity) return true;
    if (activity.type === "course") return !availableDays.has(DAY_NAMES_MAP[date.getDay()]);
    if (activity.type === "workshop") {
      const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return !workshopDates.has(ds);
    }
    return true;
  };

  const slots: AvailableSlot[] = useMemo(() => {
    if (!selectedDate || !activity) return [];
    if (activity.type === "course") {
      const dayName = DAY_NAMES_MAP[selectedDate.getDay()];
      return schedules
        .filter(s => s.day === dayName)
        .map(s => ({
          id: s.id, name: activity.name, time: s.time, end_time: s.end_time,
          duration: calcDuration(s.time, s.end_time), instructor: activity.instructor || "Élodie",
          spots: s.spots, spotsLeft: s.spots_left, type: "course" as const,
          sourceId: activity.id, scheduleId: s.id,
        }));
    }
    if (activity.type === "workshop") {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      if (activity.date === dateStr) {
        return [{
          id: activity.id, name: activity.name, time: activity.time,
          end_time: activity.end_time || "", duration: calcDuration(activity.time, activity.end_time || "") || activity.duration,
          instructor: "Élodie", spots: activity.spots, spotsLeft: activity.spots_left,
          type: "workshop" as const, sourceId: activity.id, price: activity.price,
        }];
      }
    }
    return [];
  }, [selectedDate, activity, schedules]);

  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  useEffect(() => {
    if (!selectedSlotData || !selectedDate) { setBookingBlocked(null); return; }
    const now = new Date();
    const [h, m] = selectedSlotData.time.split(":").map(Number);
    const courseStart = new Date(selectedDate);
    courseStart.setHours(h, m, 0, 0);
    const diffMs = courseStart.getTime() - now.getTime();
    const diffMin = diffMs / (1000 * 60);
    if (diffMin < 30) {
      setBookingBlocked("Ce cours commence dans moins de 30 minutes et ne peut plus être réservé.");
    } else {
      setBookingBlocked(null);
    }
  }, [selectedSlotData, selectedDate]);

  const applicableConditions = useMemo(() => {
    if (!activity) return [];
    const cat = activity.category || (activity.type === "course" ? "yoga" : "bien-etre");
    return conditions.filter(c => c.applies_to.includes(cat));
  }, [conditions, activity]);

  // Determine if user needs credits for this activity
  const needsCredits = activity?.type === "course";
  const isWorkshopDirect = activity?.type === "workshop";

  const handleProceedToConfirm = () => {
    // Step 1: Check if logged in — redirect to login page
    if (!currentProfile) {
      const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
      navigate(`/login?returnTo=${returnTo}`);
      return;
    }
    // Step 2: Check credits for courses
    if (needsCredits && currentProfile.credits <= 0) {
      setBookingStep("credits");
      return;
    }
    // Step 3: For workshops, trigger payment
    if (isWorkshopDirect) {
      const price = activity.price || 35;
      setStripeAmount(price);
      setStripeDescription(`${activity.name} — Paiement direct`);
      setPaymentPurpose("workshop");
      setShowStripeModal(true);
      return;
    }
    // Otherwise go straight to confirm
    handleFinalConfirm();
  };

  // handleLoginSubmit removed — login is now handled via redirect to /login page


  const handleBuyCard = (card: typeof CARD_OPTIONS[0]) => {
    setSelectedCard(card);
    setStripeAmount(card.price);
    setStripeDescription(`${card.label} — MyIgiStudio`);
    setPaymentPurpose("card");
    setShowStripeModal(true);
  };

  const handleStripeSuccess = () => {
    setShowStripeModal(false);
    if (paymentPurpose === "card" && selectedCard) {
      addCredits(selectedCard.sessions, selectedCard.label);
      addNotification(
        `${currentProfile?.name || "Client"} vient d'acheter une ${selectedCard.label}`,
        "purchase"
      );
      toast({ title: `${selectedCard.label} achetée avec succès ! 🎉` });
      setBookingStep("select");
      // Now they have credits, proceed to confirm
      setTimeout(() => handleFinalConfirm(), 300);
    } else if (paymentPurpose === "workshop") {
      addNotification(
        `${currentProfile?.name || "Client"} a payé pour ${activity?.name}`,
        "purchase"
      );
      toast({ title: "Paiement confirmé ! 🎉" });
      handleFinalConfirm();
    }
  };

  const handleFinalConfirm = async () => {
    if (!selectedSlotData || !selectedDate || bookingBlocked) return;
    if (applicableConditions.length > 0 && !conditionsAccepted) {
      toast({ title: "Veuillez accepter les conditions", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const clientName = currentProfile?.name || "Visiteur";

    const { error } = await supabase.from("reservations").insert({
      client_name: clientName,
      activity_name: selectedSlotData.name,
      activity_type: selectedSlotData.type,
      course_id: selectedSlotData.type === "course" ? selectedSlotData.sourceId : null,
      workshop_id: selectedSlotData.type === "workshop" ? selectedSlotData.sourceId : null,
      schedule_id: selectedSlotData.scheduleId || null,
      date: dateStr,
      time: selectedSlotData.time,
      end_time: selectedSlotData.end_time,
      participants,
      status: "confirmé",
    } as any);

    if (error) {
      toast({ title: "Erreur lors de la réservation", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Update spots
    if (selectedSlotData.scheduleId) {
      await supabase.from("course_schedules").update({ spots_left: selectedSlotData.spotsLeft - participants }).eq("id", selectedSlotData.scheduleId);
    } else if (selectedSlotData.type === "workshop") {
      await supabase.from("workshops").update({ spots_left: selectedSlotData.spotsLeft - participants }).eq("id", selectedSlotData.sourceId);
    }

    // Decrement demo credit for courses
    if (needsCredits) {
      useCredit();
      // Also update DB card
      const { data: activeCards } = await supabase
        .from("client_cards")
        .select("*")
        .eq("client_name", clientName)
        .gte("expires_at", new Date().toISOString().split("T")[0])
        .order("expires_at", { ascending: true });
      if (activeCards && activeCards.length > 0) {
        const card = (activeCards as any[]).find(c => c.used_sessions < c.total_sessions);
        if (card) {
          await supabase.from("client_cards").update({ used_sessions: card.used_sessions + 1 } as any).eq("id", card.id);
        }
      }
    }

    // Add demo reservation & notification
    addReservation(selectedSlotData.name, dateStr, selectedSlotData.time);
    addNotification(
      `${clientName} a réservé ${selectedSlotData.name} du ${selectedDate.toLocaleDateString("fr-FR")}`,
      "reservation"
    );

    setSubmitting(false);
    setConfirmed(true);
    setBookingStep("select");
  };

  const handleConfirmClick = () => {
    if (bookingStep === "credits") return;
    handleProceedToConfirm();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  if (!activityType || !activityId || !activity) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réserver une activité</h1>
            <p className="text-muted-foreground mb-6">
              Choisissez une activité depuis notre planning ou nos pages de cours pour commencer votre réservation.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/calendrier"><Button>Voir le planning</Button></Link>
              <Link to="/yoga"><Button variant="outline">Yoga & Pilates</Button></Link>
              <Link to="/poterie"><Button variant="outline">Poterie</Button></Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-primary-dark" />
            </div>
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réservation confirmée !</h1>
            <p className="text-muted-foreground mb-2">
              <strong>{selectedSlotData?.name}</strong> pour <strong>{currentProfile?.name || "Visiteur"}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {selectedSlotData?.time}
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/mon-espace"><Button>Mes réservations</Button></Link>
              <Link to="/calendrier"><Button variant="outline">Retour au planning</Button></Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" className="mb-2 gap-1.5" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark">
              Réserver : {activity.name}
            </h1>
            {activity.description && (
              <p className="text-muted-foreground mt-1 text-sm">{activity.description}</p>
            )}
          </div>




          {/* Demo: Credits step */}
          {bookingStep === "credits" && (
            <div className="rounded-xl border bg-card p-6 mb-6 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary-dark" />
                <h2 className="font-display font-semibold text-primary-dark">Crédits insuffisants</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Vous avez <strong>{currentProfile?.credits || 0}</strong> crédit(s). Achetez une carte pour réserver ce cours.
              </p>
              <div className="grid gap-2">
                {CARD_OPTIONS.map(card => (
                  <button
                    key={card.sessions}
                    onClick={() => handleBuyCard(card)}
                    className="flex items-center justify-between rounded-lg border bg-background p-3 hover:border-primary-dark/40 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{card.label}</p>
                      <p className="text-xs text-muted-foreground">{(card.price / card.sessions).toFixed(0)}€ / cours</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary-dark">{card.price}€</span>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setBookingStep("select")}>
                ← Retour
              </Button>
            </div>
          )}

          <div className={`grid ${directBooking ? "" : "md:grid-cols-2"} gap-6`}>
            {/* Calendar */}
            {!directBooking && (
            <div>
              <h2 className="text-sm font-semibold text-primary-dark mb-3">Choisissez une date</h2>
              <div className="rounded-xl border bg-card p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedSlot(""); }}
                  locale={fr}
                  disabled={isDateDisabled}
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
              {activity.type === "course" && availableDays.size > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Disponible : {Array.from(availableDays).join(", ")}
                </p>
              )}
            </div>
            )}

            {/* Slot + participants + confirm */}
            <div className="space-y-4">
              {selectedDate ? (
                <>
                  <h2 className="text-sm font-semibold text-primary-dark">
                    {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </h2>

                  {slots.length > 0 ? (
                    <div className="space-y-2">
                      {slots.map(slot => (
                        <div
                          key={slot.id}
                          onClick={() => slot.spotsLeft > 0 && setSelectedSlot(slot.id)}
                          className={cn(
                            "rounded-lg border p-3 cursor-pointer transition-all",
                            selectedSlot === slot.id ? "border-primary-dark ring-2 ring-primary-dark/20 bg-primary/5" : "hover:border-primary-dark/50",
                            slot.spotsLeft === 0 && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{slot.time}{slot.end_time ? ` - ${slot.end_time}` : ""}</span>
                            <span className="text-muted-foreground">· {slot.duration}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {slot.spotsLeft === 0 ? (
                              <span className="text-destructive font-medium">Complet</span>
                            ) : (
                              <span>{slot.spotsLeft}/{slot.spots} places</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">Aucun créneau disponible.</p>
                  )}

                  {selectedSlotData && (
                    <div className="space-y-4 pt-2">
                      {/* Participants */}
                      <div>
                        <Label className="text-sm">Participants</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setParticipants(Math.max(1, participants - 1))}>-</Button>
                          <Input
                            type="number" min={1} max={selectedSlotData.spotsLeft}
                            value={participants}
                            onChange={(e) => setParticipants(Math.min(Number(e.target.value), selectedSlotData.spotsLeft))}
                            className="w-16 text-center h-8"
                          />
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setParticipants(Math.min(selectedSlotData.spotsLeft, participants + 1))}>+</Button>
                        </div>
                      </div>

                      {/* Demo credit info */}
                      {currentProfile && needsCredits && (
                        <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary-dark" />
                          <span className="text-sm">
                            <strong>{currentProfile.credits}</strong> crédit{currentProfile.credits > 1 ? "s" : ""} disponible{currentProfile.credits > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      {/* Summary */}
                      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Activité</span>
                          <span className="font-medium">{selectedSlotData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">{selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Horaire</span>
                          <span className="font-medium">{selectedSlotData.time} - {selectedSlotData.end_time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Participants</span>
                          <span className="font-medium">{participants}</span>
                        </div>
                      </div>

                      {/* Booking blocked warning */}
                      {bookingBlocked && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                          <p className="text-sm text-destructive">{bookingBlocked}</p>
                        </div>
                      )}

                      {/* Gift voucher code */}
                      <div className="space-y-2">
                        <Label className="text-sm flex items-center gap-1.5">
                          <Gift className="h-3.5 w-3.5" /> Code bon cadeau (optionnel)
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="IGI-XXXXXXXX"
                            value={voucherCode}
                            onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherStatus("idle"); }}
                            className="font-mono text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!voucherCode.trim() || voucherStatus === "checking"}
                            onClick={async () => {
                              setVoucherStatus("checking");
                              const { data } = await supabase
                                .from("gift_vouchers")
                                .select("id, used, expires_at")
                                .eq("code", voucherCode.trim())
                                .single();
                              if (!data) { setVoucherStatus("invalid"); return; }
                              if ((data as any).used || new Date((data as any).expires_at) < new Date()) { setVoucherStatus("invalid"); return; }
                              setVoucherStatus("valid");
                            }}
                          >
                            Vérifier
                          </Button>
                        </div>
                        {voucherStatus === "valid" && (
                          <p className="text-xs text-primary-dark font-medium">✓ Bon cadeau valide</p>
                        )}
                        {voucherStatus === "invalid" && (
                          <p className="text-xs text-destructive">Code invalide, expiré ou déjà utilisé</p>
                        )}
                      </div>

                      {/* Conditions */}
                      {applicableConditions.length > 0 && !bookingBlocked && (
                        <div className="space-y-3">
                          <Accordion type="multiple" className="w-full">
                            {applicableConditions.map(c => (
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
                              id="accept-conditions"
                              checked={conditionsAccepted}
                              onCheckedChange={(v) => setConditionsAccepted(!!v)}
                            />
                            <label htmlFor="accept-conditions" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                              J'ai lu et j'accepte les conditions ci-dessus
                            </label>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handleConfirmClick}
                        disabled={submitting || !!bookingBlocked || (applicableConditions.length > 0 && !conditionsAccepted)}
                        className="w-full bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-1.5"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Confirmer la réservation
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Sélectionnez une date pour voir les créneaux disponibles.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Mock Stripe Modal */}
      <MockStripeModal
        open={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        onSuccess={handleStripeSuccess}
        amount={stripeAmount}
        description={stripeDescription}
      />
    </div>
  );
}
