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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Check, Clock, Users, Loader2, AlertTriangle, Gift, CreditCard, ShoppingCart, Sparkles, LogIn, UserPlus, User, Star, Mail, MessageCircle } from "lucide-react";
import ContactElodieButton from "@/components/ContactElodieButton";
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

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  sort_order: number;
  payment_info: string;
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

type BookingStep = "auth" | "register" | "registering" | "login" | "offers" | "confirm";

export default function Reserver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentProfile, setCurrentProfile, getDefaultProfile, tempProfiles, createTempProfile, addCredits, useCredit, addReservation, addNotification } = useDemoContext();

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
  const [voucherData, setVoucherData] = useState<any>(null);

  // Flow state
  const [bookingStep, setBookingStep] = useState<BookingStep>("auth");
  const [isNewUser, setIsNewUser] = useState(false);
  const [registerName, setRegisterName] = useState("");

  // Stripe state
  const [selectedCard, setSelectedCard] = useState<PricingCard | null>(null);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeDescription, setStripeDescription] = useState("");
  const [paymentPurpose, setPaymentPurpose] = useState<"card" | "workshop">("card");

  // Pre-payment confirmation dialog
  const [prePaymentCard, setPrePaymentCard] = useState<PricingCard | null>(null);
  const [prePaymentConditionsAccepted, setPrePaymentConditionsAccepted] = useState(false);

  // Pricing cards from DB
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);

  // Voucher-only mode (skip purchase, use gift voucher instead)
  const [useVoucherMode, setUseVoucherMode] = useState(false);
  const [offerVoucherCode, setOfferVoucherCode] = useState("");
  const [offerVoucherStatus, setOfferVoucherStatus] = useState<"idle" | "valid" | "invalid" | "checking">("idle");
  const [offerVoucherData, setOfferVoucherData] = useState<any>(null);
  const [voucherUsedInOffers, setVoucherUsedInOffers] = useState(false);

  // Second participant input
  const [secondParticipantName, setSecondParticipantName] = useState("");

  // Show voucher input in confirm step
  const [showConfirmVoucher, setShowConfirmVoucher] = useState(false);

  // Load pricing cards from DB
  useEffect(() => {
    supabase.from("pricing_cards").select("*").order("sort_order").then(({ data }) => {
      if (data) setPricingCards(data as unknown as PricingCard[]);
    });
  }, []);

  // Determine initial step based on profile
  useEffect(() => {
    if (currentProfile) {
      const needsCredits = activity?.type === "course";
      if (needsCredits && currentProfile.credits <= 0) {
        setBookingStep("offers");
      } else {
        setBookingStep("confirm");
      }
    } else {
      setBookingStep("auth");
    }
  }, [currentProfile, activity]);

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

  const needsCredits = activity?.type === "course";
  const isWorkshopDirect = activity?.type === "workshop";

  // Credits needed for current participants
  const creditsNeeded = needsCredits ? participants : 0;

  // --- Auth step handlers ---
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName.trim()) return;
    // Show loading simulation
    setBookingStep("registering");
    setTimeout(() => {
      createTempProfile(registerName.trim());
      setIsNewUser(true);
      if (needsCredits) {
        setBookingStep("offers");
      } else {
        setBookingStep("confirm");
      }
    }, 2000);
  };

  const handleLoginSelect = (profile: any) => {
    setCurrentProfile(profile);
    setIsNewUser(false);
    if (needsCredits && profile.credits <= 0) {
      setBookingStep("offers");
    } else {
      setBookingStep("confirm");
    }
  };

  // --- Pre-payment card confirmation ---
  const handleChooseCard = (card: PricingCard) => {
    setPrePaymentCard(card);
    setPrePaymentConditionsAccepted(false);
  };

  const handleConfirmPrePayment = () => {
    if (!prePaymentCard) return;
    setSelectedCard(prePaymentCard);
    setStripeAmount(prePaymentCard.price);
    setStripeDescription(`${prePaymentCard.name} — MyIgiStudio`);
    setPaymentPurpose("card");
    setPrePaymentCard(null);
    setShowStripeModal(true);
  };

  // --- Voucher validation in offers step ---
  const handleValidateOfferVoucher = async () => {
    if (!offerVoucherCode.trim()) return;
    setOfferVoucherStatus("checking");
    const { data } = await supabase
      .from("gift_vouchers")
      .select("*")
      .eq("code", offerVoucherCode.trim().toUpperCase())
      .single();
    if (!data) { setOfferVoucherStatus("invalid"); setOfferVoucherData(null); return; }
    const voucher = data as any;
    if (voucher.used || new Date(voucher.expires_at) < new Date()) {
      setOfferVoucherStatus("invalid");
      setOfferVoucherData(null);
      return;
    }
    setOfferVoucherStatus("valid");
    setOfferVoucherData(voucher);
  };

  const handleUseVoucher = () => {
    if (!offerVoucherData) return;
    const sessions = offerVoucherData.sessions || 1;
    addCredits(sessions, `Bon cadeau ${offerVoucherData.code}`);
    addNotification(
      `${currentProfile?.name || "Client"} a utilisé un bon cadeau (${offerVoucherData.code})`,
      "purchase"
    );
    toast({ title: `Bon cadeau activé ! ${sessions} crédit${sessions > 1 ? "s" : ""} ajouté${sessions > 1 ? "s" : ""} 🎉` });
    setVoucherUsedInOffers(true);
    setBookingStep("confirm");
  };

  // --- Voucher validation in confirm step ---
  const handleValidateConfirmVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherStatus("checking");
    const { data } = await supabase
      .from("gift_vouchers")
      .select("*")
      .eq("code", voucherCode.trim().toUpperCase())
      .single();
    if (!data) { setVoucherStatus("invalid"); setVoucherData(null); return; }
    const voucher = data as any;
    if (voucher.used || new Date(voucher.expires_at) < new Date()) {
      setVoucherStatus("invalid");
      setVoucherData(null);
      return;
    }
    setVoucherStatus("valid");
    setVoucherData(voucher);
    // Add credits from voucher
    const sessions = voucher.sessions || 1;
    addCredits(sessions, `Bon cadeau ${voucher.code}`);
    addNotification(
      `${currentProfile?.name || "Client"} a utilisé un bon cadeau (${voucher.code})`,
      "purchase"
    );
    toast({ title: `Bon cadeau activé ! ${sessions} crédit${sessions > 1 ? "s" : ""} ajouté${sessions > 1 ? "s" : ""} 🎉` });
    setShowConfirmVoucher(false);
  };

  const handleStripeSuccess = () => {
    setShowStripeModal(false);
    if (paymentPurpose === "card" && selectedCard) {
      addCredits(selectedCard.sessions, selectedCard.name);
      addNotification(
        `${currentProfile?.name || "Client"} vient d'acheter une ${selectedCard.name}`,
        "purchase"
      );
      toast({ title: `${selectedCard.name} achetée avec succès ! 🎉` });
      setBookingStep("confirm");
    } else if (paymentPurpose === "workshop") {
      addNotification(
        `${currentProfile?.name || "Client"} a payé pour ${activity?.name}`,
        "purchase"
      );
      toast({ title: "Paiement confirmé ! 🎉" });
      handleFinalConfirm();
    }
  };

  // --- Final confirm ---
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

    // Decrement demo credits for courses (1 per participant)
    if (needsCredits) {
      for (let i = 0; i < participants; i++) {
        useCredit();
      }
      const { data: activeCards } = await supabase
        .from("client_cards")
        .select("*")
        .eq("client_name", clientName)
        .gte("expires_at", new Date().toISOString().split("T")[0])
        .order("expires_at", { ascending: true });
      if (activeCards && activeCards.length > 0) {
        let remaining = participants;
        for (const card of activeCards as any[]) {
          if (remaining <= 0) break;
          const available = card.total_sessions - card.used_sessions;
          const toUse = Math.min(available, remaining);
          if (toUse > 0) {
            await supabase.from("client_cards").update({ used_sessions: card.used_sessions + toUse } as any).eq("id", card.id);
            remaining -= toUse;
          }
        }
      }
    }

    addReservation(selectedSlotData.name, dateStr, selectedSlotData.time);
    addNotification(
      `${clientName} a réservé ${selectedSlotData.name} du ${selectedDate.toLocaleDateString("fr-FR")}`,
      "reservation"
    );

    setSubmitting(false);
    navigate("/mon-espace?welcome=1");
  };

  const handleConfirmClick = () => {
    if (!currentProfile) {
      setBookingStep("auth");
      return;
    }
    if (isWorkshopDirect) {
      const price = activity.price || 35;
      setStripeAmount(price);
      setStripeDescription(`${activity.name} — Paiement direct`);
      setPaymentPurpose("workshop");
      setShowStripeModal(true);
      return;
    }
    // Check enough credits for participants
    if (needsCredits && currentProfile.credits < participants) {
      toast({ title: `Crédits insuffisants. Il vous faut ${participants} crédit${participants > 1 ? "s" : ""} pour ${participants} participant${participants > 1 ? "s" : ""}.`, variant: "destructive" });
      return;
    }
    handleFinalConfirm();
  };

  // Unit price for savings calc
  const unitCard = pricingCards.find(c => c.sessions === 1);
  const unitPrice = unitCard ? unitCard.price : null;

  // Selection summary block (reusable)
  const renderSelectionSummary = () => {
    if (!selectedSlotData || !selectedDate) return null;
    return (
      <div className="rounded-lg bg-muted/50 p-4 space-y-1 text-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Votre sélection</p>
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
      </div>
    );
  };

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  // --- No activity ---
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

  // Client-only profiles for login selection
  const clientDefaultProfiles = [
    { id: "marion", name: "Marion", subtitle: "Nouvelle cliente" },
    { id: "sophie", name: "Sophie", subtitle: "Cliente existante (4 crédits)" },
  ];

  // ─── RENDER ───
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
            {currentProfile && (
              <p className="text-sm text-primary-dark font-medium mt-2">
                Connecté en tant que <strong>{currentProfile.name}</strong>
              </p>
            )}
          </div>

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP: AUTH — Not logged in */}
          {/* ═══════════════════════════════════════════════ */}
          {bookingStep === "auth" && !currentProfile && (
            <div className="max-w-md mx-auto space-y-6">
              {/* Selection summary ABOVE the auth card */}
              {renderSelectionSummary()}

              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                  <User className="h-7 w-7 text-primary-dark" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-semibold text-primary-dark">
                    Pour vous inscrire, connectez-vous ou créez un compte
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    C'est rapide et vous permettra de gérer vos réservations.
                  </p>
                </div>
                <div className="grid gap-3 pt-2">
                  <Button
                    className="w-full gap-2"
                    onClick={() => setBookingStep("login")}
                  >
                    <LogIn className="h-4 w-4" /> Se connecter
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setBookingStep("register")}
                  >
                    <UserPlus className="h-4 w-4" /> Créer un compte
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP: REGISTER — Create account */}
          {/* ═══════════════════════════════════════════════ */}
          {bookingStep === "register" && !currentProfile && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-display font-semibold text-primary-dark">Créer un compte</h2>
                  <p className="text-sm text-muted-foreground mt-1">Saisissez votre prénom pour commencer</p>
                </div>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-name">Prénom</Label>
                    <Input
                      id="register-name"
                      placeholder="Ex : Marc"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Créer mon compte
                  </Button>
                </form>
                <button
                  onClick={() => setBookingStep("auth")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                >
                  ← Retour
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP: REGISTERING — Loading simulation */}
          {/* ═══════════════════════════════════════════════ */}
          {bookingStep === "registering" && (
            <div className="max-w-md mx-auto">
              <div className="rounded-xl border bg-card p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-primary-dark animate-pulse" />
                </div>
                <h2 className="text-lg font-display font-semibold text-primary-dark">
                  Création de votre compte...
                </h2>
                <p className="text-sm text-muted-foreground">
                  Envoi du mail de confirmation en cours
                </p>
                <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP: LOGIN — Choose existing client account */}
          {/* ═══════════════════════════════════════════════ */}
          {bookingStep === "login" && !currentProfile && (
            <div className="max-w-md mx-auto space-y-4">
              {/* Selection summary above login */}
              {renderSelectionSummary()}

              <div className="text-center mb-2">
                <h2 className="text-lg font-display font-semibold text-primary-dark">Se connecter</h2>
                <p className="text-sm text-muted-foreground mt-1">Choisissez votre compte</p>
              </div>

              <div className="space-y-2">
                {clientDefaultProfiles.map(card => {
                  const profile = getDefaultProfile(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() => profile && handleLoginSelect(profile)}
                      className="w-full flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{card.name}</p>
                        <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                      </div>
                    </button>
                  );
                })}

                {/* Temp profiles (previously created accounts) */}
                {tempProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleLoginSelect(p)}
                    className="w-full flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                      <User className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setBookingStep("auth")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2"
              >
                ← Retour
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP: OFFERS — Buy a card OR use gift voucher */}
          {/* ═══════════════════════════════════════════════ */}
          {bookingStep === "offers" && currentProfile && needsCredits && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Greeting */}
              <div className="text-center">
                <h2 className="text-xl font-display font-semibold text-primary-dark">
                  {currentProfile.name}, choisissez votre formule
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentProfile.cards.length === 0
                    ? "Les cours de Yoga & Pilates fonctionnent avec un système de crédits. Choisissez la formule qui vous correspond."
                    : "Vous n'avez plus de crédits. Rechargez pour continuer à réserver."
                  }
                </p>
              </div>

              {/* How it works for first-timers */}
              {currentProfile.cards.length === 0 && (
                <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary-dark" />
                    <h3 className="font-display font-semibold text-primary-dark">Comment ça marche ?</h3>
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-dark text-primary-dark-foreground flex items-center justify-center text-xs font-bold">1</span>
                      <p className="text-sm">Achetez une <strong>carte de cours</strong> ou utilisez un <strong>bon cadeau</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-dark text-primary-dark-foreground flex items-center justify-center text-xs font-bold">2</span>
                      <p className="text-sm">Chaque réservation utilise <strong>1 crédit</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-dark text-primary-dark-foreground flex items-center justify-center text-xs font-bold">3</span>
                      <p className="text-sm">Réservez autant de cours que vous voulez !</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Gift voucher FIRST, before offers */}
              {!useVoucherMode && (
                <button
                  onClick={() => setUseVoucherMode(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-primary-dark font-medium hover:bg-primary/10 transition-colors"
                >
                  <Gift className="h-5 w-5" /> J'ai un bon cadeau
                </button>
              )}

              {/* Voucher input mode */}
              {useVoucherMode && (
                <div className="rounded-xl border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-primary-dark" />
                    <h3 className="font-display font-semibold text-primary-dark">Utiliser un bon cadeau</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Saisissez le code de votre bon cadeau pour l'activer et créditer votre compte.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="IGI-XXXXXXXX"
                      value={offerVoucherCode}
                      onChange={e => { setOfferVoucherCode(e.target.value.toUpperCase()); setOfferVoucherStatus("idle"); setOfferVoucherData(null); }}
                      className="font-mono text-sm"
                      autoFocus
                    />
                    <Button
                      variant="outline"
                      disabled={!offerVoucherCode.trim() || offerVoucherStatus === "checking"}
                      onClick={handleValidateOfferVoucher}
                    >
                      {offerVoucherStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
                    </Button>
                  </div>
                  {offerVoucherStatus === "valid" && offerVoucherData && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                        <p className="text-sm text-primary-dark font-medium">
                          ✓ Bon cadeau valide — {offerVoucherData.sessions || 1} crédit{(offerVoucherData.sessions || 1) > 1 ? "s" : ""}
                        </p>
                        {offerVoucherData.card_name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{offerVoucherData.card_name}</p>
                        )}
                      </div>
                      <Button className="w-full" onClick={handleUseVoucher}>
                        <Gift className="h-4 w-4 mr-1.5" /> Activer mon bon cadeau
                      </Button>
                    </div>
                  )}
                  {offerVoucherStatus === "invalid" && (
                    <p className="text-xs text-destructive">Code invalide, expiré ou déjà utilisé.</p>
                  )}

                  <button
                    onClick={() => { setUseVoucherMode(false); setOfferVoucherCode(""); setOfferVoucherStatus("idle"); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                  >
                    ← Voir les cartes de cours
                  </button>
                </div>
              )}

              {/* Separator + Contact Élodie */}
              {!useVoucherMode && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1 border-t" />
                      <span className="text-sm text-muted-foreground">ou choisissez une carte</span>
                      <div className="flex-1 border-t" />
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ContactElodieButton variant="outline" />
                  </div>

                  {/* Pricing cards grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pricingCards.map(card => {
                      const perSession = card.sessions > 0 && card.sessions < 9999 ? card.price / card.sessions : null;
                      const savingsPercent = unitPrice && perSession && card.sessions > 1
                        ? Math.round((1 - perSession / unitPrice) * 100)
                        : null;

                      return (
                        <div
                          key={card.id}
                          className={cn(
                            "relative rounded-xl border p-5 bg-card flex flex-col cursor-pointer transition-all hover:shadow-md",
                            card.popular
                              ? "border-primary-dark shadow-lg ring-2 ring-primary-dark/20"
                              : "hover:border-primary/40"
                          )}
                          onClick={() => handleChooseCard(card)}
                        >
                          {card.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                              <Star className="h-3 w-3" /> Populaire
                            </div>
                          )}

                          <h3 className="font-display font-semibold text-lg text-primary-dark">{card.name}</h3>
                          <div className="mt-3 mb-1">
                            <span className="text-3xl font-bold text-foreground">{card.price}€</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`} · {card.validity}
                          </p>

                          {perSession !== null && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {perSession.toFixed(2)}€ / cours
                              {savingsPercent && savingsPercent > 0 && (
                                <span className="ml-1.5 text-primary font-semibold">-{savingsPercent}%</span>
                              )}
                            </p>
                          )}
                          {card.sessions >= 9999 && (
                            <p className="text-xs text-muted-foreground mb-1">Accès illimité</p>
                          )}

                          {card.payment_info && (
                            <p className="text-xs text-primary italic mb-3">{card.payment_info}</p>
                          )}

                          <div className="mt-auto pt-3">
                            <Button
                              className={cn(
                                "w-full",
                                card.popular ? "bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90" : ""
                              )}
                              variant={card.popular ? "default" : "outline"}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1.5" /> Choisir
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* STEP: CONFIRM — Reservation form */}
          {/* ═══════════════════════════════════════════════ */}
          {bookingStep === "confirm" && currentProfile && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Section 1: Confirmer l'inscription */}
              <h2 className="text-xl font-display font-semibold text-primary-dark">
                Confirmer l'inscription
              </h2>

              {/* Section 2: Activity info */}
              {selectedSlotData && selectedDate && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                  <h3 className="text-xs font-semibold text-primary-dark uppercase tracking-wide mb-2">
                    Infos de l'activité
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">{selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horaire</span>
                    <span className="font-medium">{selectedSlotData.time} - {selectedSlotData.end_time}</span>
                  </div>
                  {selectedSlotData.duration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Durée</span>
                      <span className="font-medium">{selectedSlotData.duration}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Places restantes</span>
                    <span className="font-medium">{selectedSlotData.spotsLeft}/{selectedSlotData.spots}</span>
                  </div>
                  {isWorkshopDirect && selectedSlotData.price != null && (
                    <div className="flex justify-between border-t pt-2 mt-1">
                      <span className="text-muted-foreground">Prix</span>
                      <span className="font-semibold text-primary-dark">{selectedSlotData.price} €</span>
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Credits/voucher status */}
              {needsCredits && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
                  <p className="text-sm font-medium text-primary-dark">
                    {currentProfile.name}, vous avez <strong>{currentProfile.credits} crédit{currentProfile.credits > 1 ? "s" : ""}</strong> disponible{currentProfile.credits > 1 ? "s" : ""}.
                  </p>
                  {voucherStatus === "valid" && (
                    <p className="text-xs text-primary-dark">+ Bon cadeau validé ✓</p>
                  )}
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <CreditCard className="h-3 w-3" /> {creditsNeeded} crédit{creditsNeeded > 1 ? "s" : ""} sera{creditsNeeded > 1 ? "ont" : ""} déduit{creditsNeeded > 1 ? "s" : ""}
                  </Badge>

                  {/* Voucher option in confirm step — only if not already used in offers */}
                  {!voucherUsedInOffers && voucherStatus !== "valid" && !showConfirmVoucher && (
                    <button
                      onClick={() => setShowConfirmVoucher(true)}
                      className="flex items-center gap-1.5 text-sm text-primary-dark font-medium hover:underline mt-1"
                    >
                      <Gift className="h-4 w-4" /> Vous avez un bon cadeau ?
                    </button>
                  )}

                  {showConfirmVoucher && voucherStatus !== "valid" && (
                    <div className="space-y-2 pt-2 border-t">
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
                          onClick={handleValidateConfirmVoucher}
                        >
                          {voucherStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
                        </Button>
                      </div>
                      {voucherStatus === "invalid" && (
                        <p className="text-xs text-destructive">Code invalide, expiré ou déjà utilisé</p>
                      )}
                      <button
                        onClick={() => { setShowConfirmVoucher(false); setVoucherCode(""); setVoucherStatus("idle"); }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>
              )}
              {isWorkshopDirect && (
                <div className="rounded-lg bg-accent/10 border border-accent/30 p-4">
                  <Badge variant="outline" className="gap-1 text-xs">
                    <ShoppingCart className="h-3 w-3" /> Paiement par carte
                  </Badge>
                </div>
              )}

              {/* Section 4: Participants */}
              {selectedSlotData && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-primary-dark">Nombre de participants</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => { setParticipants(Math.max(1, participants - 1)); setSecondParticipantName(""); }}>-</Button>
                    <Input
                      type="number" min={1} max={selectedSlotData.spotsLeft}
                      value={participants}
                      onChange={(e) => { setParticipants(Math.min(Number(e.target.value), selectedSlotData.spotsLeft)); if (Number(e.target.value) <= 1) setSecondParticipantName(""); }}
                      className="w-16 text-center h-8"
                    />
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setParticipants(Math.min(selectedSlotData.spotsLeft, participants + 1))}>+</Button>
                  </div>
                  {needsCredits && participants > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {participants} crédits seront déduits de votre compte.
                    </p>
                  )}
                  {/* Second participant name input */}
                  {participants >= 2 && (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                      <Label className="text-sm font-medium">Nom du 2ème participant</Label>
                      <Input
                        placeholder="Prénom du participant"
                        value={secondParticipantName}
                        onChange={e => setSecondParticipantName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Section 5: Conditions */}
              {bookingBlocked && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{bookingBlocked}</p>
                </div>
              )}

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

              {/* Confirm button */}
              <Button
                onClick={handleConfirmClick}
                disabled={submitting || !!bookingBlocked || (applicableConditions.length > 0 && !conditionsAccepted) || (needsCredits && currentProfile.credits < participants)}
                className="w-full bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-1.5"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isWorkshopDirect ? (
                  <ShoppingCart className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isWorkshopDirect
                  ? `Payer ${selectedSlotData?.price || activity.price || ""} € et réserver`
                  : "Confirmer l'inscription"}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Pre-payment confirmation dialog */}
      <Dialog open={!!prePaymentCard} onOpenChange={(open) => { if (!open) { setPrePaymentCard(null); setPrePaymentConditionsAccepted(false); } }}>
        <DialogContent className="sm:max-w-md">
          {prePaymentCard && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-primary-dark">
                  {prePaymentCard.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre de cours</span>
                    <span className="font-medium">{prePaymentCard.sessions >= 9999 ? "Illimité" : prePaymentCard.sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Validité</span>
                    <span className="font-medium">{prePaymentCard.validity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix</span>
                    <span className="font-semibold text-primary-dark">{prePaymentCard.price} €</span>
                  </div>
                  {prePaymentCard.payment_info && (
                    <p className="text-xs text-primary italic">{prePaymentCard.payment_info}</p>
                  )}
                </div>

                {/* Conditions in pre-payment dialog */}
                {applicableConditions.length > 0 && (
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
                        id="prepay-conditions"
                        checked={prePaymentConditionsAccepted}
                        onCheckedChange={(v) => setPrePaymentConditionsAccepted(!!v)}
                      />
                      <label htmlFor="prepay-conditions" className="text-xs text-muted-foreground cursor-pointer leading-tight">
                        J'ai lu et j'accepte les conditions
                      </label>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={applicableConditions.length > 0 && !prePaymentConditionsAccepted}
                  onClick={handleConfirmPrePayment}
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" /> Payer {prePaymentCard.price} €
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
