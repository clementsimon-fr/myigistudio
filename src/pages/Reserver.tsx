import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoContext } from "@/contexts/DemoContext";
import MockStripeModal from "@/components/demo/MockStripeModal";
import BookingSummary from "@/components/booking/BookingSummary";
import AccountChoice from "@/components/booking/AccountChoice";
import SignupBlock from "@/components/booking/SignupBlock";
import LoginBlock from "@/components/booking/LoginBlock";
import GuestForm from "@/components/booking/GuestForm";
import PurchaseOptions from "@/components/booking/PurchaseOptions";
import PaymentSummary from "@/components/booking/PaymentSummary";
import ConfirmationPopup from "@/components/booking/ConfirmationPopup";
import AddParticipant, { type ExtraParticipant } from "@/components/booking/AddParticipant";
import type { DemoProfile } from "@/contexts/DemoContext";

interface CourseScheduleRow {
  id: string; course_id: string; day: string; time: string; end_time: string; spots: number; spots_left: number;
  inclusions?: string; card_yoga_count?: number;
}

interface AvailableSlot {
  id: string; name: string; time: string; end_time: string; duration: string;
  spots: number; spotsLeft: number; type: "course" | "workshop"; sourceId: string; scheduleId?: string; price?: number;
  inclusions?: string; cardYogaCount?: number;
  linkedDates?: string[]; linkedWorkshopIds?: string[];
}

interface PricingCard {
  id: string; name: string; sessions: number; price: number; validity: string; popular: boolean; sort_order: number; payment_info: string;
}

interface ConditionRow {
  id: string; type: string; title: string; content: string; applies_to: string[]; active: boolean;
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
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

type BookingStep = "summary" | "login" | "register" | "registering" | "guest_form" | "purchase_options" | "payment" | "confirmed";

export default function Reserver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    currentProfile, setCurrentProfile, getDefaultProfile, tempProfiles,
    createTempProfile, addCredits, useCredit, addReservation, addNotification,
    guestName, setGuestName,
  } = useDemoContext();

  const activityType = searchParams.get("type") as "course" | "workshop" | null;
  const activityId = searchParams.get("id");
  const preselectedDate = searchParams.get("date");
  const preselectedScheduleId = searchParams.get("scheduleId");

  const [activity, setActivity] = useState<any>(null);
  const [schedules, setSchedules] = useState<CourseScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [instructorData, setInstructorData] = useState<{ name: string; photo_url: string } | null>(null);

  // Extra participants (2.2)
  const [extraParticipants, setExtraParticipants] = useState<ExtraParticipant[]>([]);

  // Step
  const [bookingStep, setBookingStep] = useState<BookingStep>("summary");
  const [registering, setRegistering] = useState(false);

  // Payment
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeDescription, setStripeDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Voucher
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "valid" | "invalid" | "checking">("idle");

  // Pre-payment card dialog
  const [pendingCard, setPendingCard] = useState<PricingCard | null>(null);

  // Load data
  useEffect(() => {
    supabase.from("pricing_cards").select("*").order("sort_order").then(({ data }) => {
      if (data) setPricingCards(data as unknown as PricingCard[]);
    });
  }, []);

  useEffect(() => {
    if (!activityType || !activityId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      if (activityType === "course") {
        const [courseRes, schedRes] = await Promise.all([
          supabase.from("courses").select("*").eq("id", activityId).single(),
          supabase.from("course_schedules").select("*").eq("course_id", activityId),
        ]);
        if (courseRes.data) {
          setActivity({ ...courseRes.data, type: "course" });
          // Load instructor data
          if (courseRes.data.instructor_id) {
            const { data: instrData } = await supabase.from("instructors").select("name, photo_url").eq("id", courseRes.data.instructor_id).single();
            if (instrData) setInstructorData(instrData as any);
          }
        }
        if (schedRes.data) {
          const scheds = schedRes.data as unknown as CourseScheduleRow[];
          setSchedules(scheds);
          if (preselectedDate && preselectedScheduleId) {
            setSelectedDate(new Date(preselectedDate + "T00:00:00"));
            setSelectedSlot(preselectedScheduleId);
          }
        }
      } else {
        const res = await supabase.from("workshops").select("*").eq("id", activityId).single();
        if (res.data) {
          const wsData = res.data as any;
          setActivity({ ...wsData, type: "workshop" });
          
          // If this workshop has a linked_group, fetch all siblings
          if (wsData.linked_group) {
            const { data: linkedWs } = await supabase.from("workshops").select("*")
              .eq("linked_group", wsData.linked_group).order("date");
            if (linkedWs && linkedWs.length > 1) {
              const linkedDates = (linkedWs as any[]).map(w => w.date).sort();
              const linkedIds = (linkedWs as any[]).map(w => w.id);
              setActivity((prev: any) => ({ ...prev, linkedDates, linkedWorkshopIds: linkedIds, linkedWorkshops: linkedWs }));
            }
          }
          
          if (wsData.instructor_id) {
            const { data: instrData } = await supabase.from("instructors").select("name, photo_url").eq("id", wsData.instructor_id).single();
            if (instrData) setInstructorData(instrData as any);
          }
          if (preselectedDate) {
            setSelectedDate(new Date(preselectedDate + "T00:00:00"));
            setSelectedSlot(wsData.id);
          }
        }
      }
      const { data: condData } = await supabase.from("conditions").select("*").eq("active", true).order("sort_order");
      if (condData) setConditions(condData as unknown as ConditionRow[]);
      setLoading(false);
    };
    load();
  }, [activityType, activityId, preselectedDate, preselectedScheduleId]);

  // Compute slots
  const slots: AvailableSlot[] = useMemo(() => {
    if (!selectedDate || !activity) return [];
    if (activity.type === "course") {
      const dayName = DAY_NAMES_MAP[selectedDate.getDay()];
      return schedules.filter(s => s.day === dayName).map(s => ({
        id: s.id, name: activity.name, time: s.time, end_time: s.end_time,
        duration: calcDuration(s.time, s.end_time), spots: s.spots, spotsLeft: s.spots_left,
        type: "course" as const, sourceId: activity.id, scheduleId: s.id,
        inclusions: (s as any).inclusions || "", cardYogaCount: (s as any).card_yoga_count || 0,
      }));
    }
    if (activity.type === "workshop") {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      if (activity.date === dateStr) {
        return [{
          id: activity.id, name: activity.name, time: activity.time,
          end_time: activity.end_time || "", duration: calcDuration(activity.time, activity.end_time || "") || activity.duration,
          spots: activity.spots, spotsLeft: activity.spots_left,
          type: "workshop" as const, sourceId: activity.id, price: activity.price,
          inclusions: activity.inclusions || "", cardYogaCount: activity.card_yoga_count || 0,
        }];
      }
    }
    return [];
  }, [selectedDate, activity, schedules]);

  const selectedSlotData = slots.find(s => s.id === selectedSlot);
  const category = activity?.category || (activity?.type === "course" ? "yoga" : "poterie");
  const isYoga = category === "yoga";
  const unitCard = pricingCards.find(c => c.sessions === 1);
  const unitPrice = unitCard ? unitCard.price : (activity?.price || 15);

  const applicableConditions = useMemo(() => {
    if (!activity) return [];
    const cat = activity.category || (activity.type === "course" ? "yoga" : "bien-etre");
    return conditions.filter(c => c.applies_to.includes(cat));
  }, [conditions, activity]);

  // Determine user state
  type UserState = "guest" | "logged_user_no_cards" | "logged_user_with_cards";
  const userState: UserState = !currentProfile
    ? "guest"
    : (isYoga && currentProfile.credits > 0) ? "logged_user_with_cards"
    : "logged_user_no_cards";

  // Auto-advance
  useEffect(() => {
    if (bookingStep === "summary" && currentProfile) {
      setBookingStep("purchase_options");
    }
  }, [bookingStep, currentProfile]);

  // ─── Redirect if no params ───
  if (!loading && (!activityType || !activityId || !activity)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réserver une activité</h1>
            <p className="text-muted-foreground mb-6">Choisissez une activité depuis notre planning pour commencer.</p>
            <Link to="/?view=planning"><Button>Voir le planning</Button></Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  // ─── Handlers ───
  const handleRegister = (name: string) => {
    setRegistering(true);
    setBookingStep("registering");
    setTimeout(() => {
      createTempProfile(name);
      setIsNewUser(true);
      setRegistering(false);
      setBookingStep("purchase_options");
    }, 2000);
  };

  const handleLoginSelect = (profile: DemoProfile) => {
    setCurrentProfile(profile);
    setIsNewUser(false);
    setBookingStep("purchase_options");
  };

  const handleGuestSubmit = (name: string) => {
    setGuestName(name);
    setBookingStep("purchase_options");
  };

  const handleReserveWithCard = () => {
    setPaymentMode("1 carte yoga utilisée");
    setPaymentAmount(0);
    setBookingStep("payment");
  };

  const handleBuyCard = (card: PricingCard) => {
    setPendingCard(card);
    setPaymentMode(`Achat ${card.name}`);
    setPaymentAmount(card.price);
    setStripeAmount(card.price);
    setStripeDescription(`${card.name} — MyIgiStudio`);
    setBookingStep("payment");
  };

  const handleBuyUnit = () => {
    const price = activity?.type === "workshop" ? (activity.price || 35) : (unitPrice || 15);
    setPaymentMode("Cours à l'unité");
    setPaymentAmount(price);
    setStripeAmount(price);
    setStripeDescription(`${activity.name} — Cours à l'unité`);
    setBookingStep("payment");
  };

  const handleUseVoucher = async (code: string) => {
    if (!code.trim()) return;
    setVoucherStatus("checking");
    const { data } = await supabase.from("gift_vouchers").select("*").eq("code", code.trim().toUpperCase()).single();
    if (!data) { setVoucherStatus("invalid"); return; }
    const voucher = data as any;
    if (voucher.used || new Date(voucher.expires_at) < new Date()) { setVoucherStatus("invalid"); return; }
    setVoucherStatus("valid");

    if (currentProfile) {
      const sessions = voucher.sessions || 1;
      addCredits(sessions, `Bon cadeau ${voucher.code}`);
      addNotification(`${currentProfile.name} a utilisé un bon cadeau (${voucher.code})`, "purchase");
      toast({ title: `Bon cadeau activé ! ${sessions} crédit${sessions > 1 ? "s" : ""} ajouté${sessions > 1 ? "s" : ""} 🎉` });
    }
    setPaymentMode("Bon cadeau");
    setPaymentAmount(0);
    setBookingStep("payment");
  };

  const handlePay = () => {
    if (paymentAmount > 0) {
      setShowStripeModal(true);
    } else {
      handleFinalConfirm();
    }
  };

  const handleStripeSuccess = async () => {
    setShowStripeModal(false);
    if (pendingCard) {
      addCredits(pendingCard.sessions, pendingCard.name);
      addNotification(`${currentProfile?.name || guestName || "Client"} a acheté une ${pendingCard.name}`, "purchase");
      await supabase.from("client_cards").insert({
        client_name: currentProfile?.name || guestName || "Client",
        card_name: pendingCard.name,
        total_sessions: pendingCard.sessions,
        used_sessions: 0,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      } as any);
      toast({ title: `${pendingCard.name} achetée avec succès ! 🎉` });
      setPendingCard(null);
    }
    handleFinalConfirm();
  };

  const handleFinalConfirm = async () => {
    if (!selectedSlotData || !selectedDate) return;
    setSubmitting(true);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    const clientName = currentProfile?.name || guestName || "Visiteur";
    const totalParticipants = 1 + extraParticipants.filter(p => p.firstName.trim()).length;

    await supabase.from("reservations").insert({
      client_name: clientName,
      activity_name: selectedSlotData.name,
      activity_type: selectedSlotData.type,
      course_id: selectedSlotData.type === "course" ? selectedSlotData.sourceId : null,
      workshop_id: selectedSlotData.type === "workshop" ? selectedSlotData.sourceId : null,
      schedule_id: selectedSlotData.scheduleId || null,
      date: dateStr,
      time: selectedSlotData.time,
      end_time: selectedSlotData.end_time,
      participants: totalParticipants,
      status: "confirmé",
      notes: extraParticipants.filter(p => p.firstName.trim()).map(p => `Invité: ${p.firstName} ${p.lastName}`).join(", "),
    } as any);

    // Update spots
    const spotsToDecrement = totalParticipants;
    if (selectedSlotData.scheduleId) {
      await supabase.from("course_schedules").update({ spots_left: selectedSlotData.spotsLeft - spotsToDecrement }).eq("id", selectedSlotData.scheduleId);
    } else if (selectedSlotData.type === "workshop") {
      await supabase.from("workshops").update({ spots_left: selectedSlotData.spotsLeft - spotsToDecrement }).eq("id", selectedSlotData.sourceId);
    }

    // Decrement card if using card
    if (paymentMode === "1 carte yoga utilisée" && currentProfile) {
      useCredit();
      const { data: activeCards } = await supabase
        .from("client_cards").select("*")
        .eq("client_name", clientName)
        .gte("expires_at", new Date().toISOString().split("T")[0])
        .order("expires_at", { ascending: true });
      if (activeCards && activeCards.length > 0) {
        const card = activeCards[0] as any;
        if (card.total_sessions > card.used_sessions) {
          await supabase.from("client_cards").update({ used_sessions: card.used_sessions + 1 } as any).eq("id", card.id);
        }
      }
    }

    addReservation(selectedSlotData.name, dateStr, selectedSlotData.time);
    addNotification(`${clientName} a réservé ${selectedSlotData.name} du ${selectedDate.toLocaleDateString("fr-FR")}${totalParticipants > 1 ? ` (${totalParticipants} pers.)` : ""}`, "reservation");
    setSubmitting(false);
    setBookingStep("confirmed");
  };

  const handleViewReservation = () => {
    if (isNewUser) {
      navigate("/mon-espace?welcome=1");
    } else {
      navigate("/mon-espace");
    }
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-lg">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" className="mb-2 gap-1.5" onClick={() => {
              if (bookingStep === "login" || bookingStep === "register" || bookingStep === "guest_form") {
                setBookingStep("summary");
              } else if (bookingStep === "purchase_options") {
                if (!currentProfile && !guestName) setBookingStep("summary");
                else window.history.back();
              } else if (bookingStep === "payment") {
                setBookingStep("purchase_options");
              } else {
                window.history.back();
              }
            }}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <h1 className="text-xl md:text-2xl font-display font-bold text-primary-dark">
              Réserver : {activity.name}
            </h1>
            {currentProfile && (
              <p className="text-sm text-primary-dark font-medium mt-1">
                Connecté en tant que <strong>{currentProfile.name}</strong>
              </p>
            )}
            {!currentProfile && guestName && (
              <p className="text-sm text-muted-foreground mt-1">
                Invité : <strong>{guestName}</strong>
              </p>
            )}
          </div>

          {/* ═══ STEP: SUMMARY ═══ */}
          {bookingStep === "summary" && !currentProfile && (
            <div className="space-y-6">
              {selectedSlotData && selectedDate && (
                <BookingSummary
                  activityName={selectedSlotData.name}
                  date={selectedDate}
                  time={selectedSlotData.time}
                  endTime={selectedSlotData.end_time}
                  duration={selectedSlotData.duration}
                  price={selectedSlotData.price || unitPrice || undefined}
                  category={category}
                  isYoga={isYoga}
                  pricingCards={pricingCards}
                  inclusions={selectedSlotData.inclusions}
                  longDescription={activity?.long_description}
                  shortDescription={activity?.description}
                  instructorName={instructorData?.name || activity?.instructor}
                  instructorPhoto={instructorData?.photo_url}
                  cardYogaCount={selectedSlotData.cardYogaCount}
                />
              )}
              <AccountChoice
                onLogin={() => setBookingStep("login")}
                onRegister={() => setBookingStep("register")}
                onGuest={() => setBookingStep("guest_form")}
              />
            </div>
          )}

          {/* ═══ STEP: LOGIN ═══ */}
          {bookingStep === "login" && !currentProfile && (
            <LoginBlock onSelect={handleLoginSelect} onBack={() => setBookingStep("summary")} />
          )}

          {/* ═══ STEP: REGISTER ═══ */}
          {(bookingStep === "register" || bookingStep === "registering") && !currentProfile && (
            <SignupBlock onSubmit={handleRegister} onBack={() => setBookingStep("summary")} registering={registering} />
          )}

          {/* ═══ STEP: GUEST FORM ═══ */}
          {bookingStep === "guest_form" && !currentProfile && (
            <GuestForm onSubmit={handleGuestSubmit} onBack={() => setBookingStep("summary")} />
          )}

          {/* ═══ STEP: PURCHASE OPTIONS ═══ */}
          {bookingStep === "purchase_options" && (
            <div className="space-y-6">
              {selectedSlotData && selectedDate && (
                <BookingSummary
                  activityName={selectedSlotData.name}
                  date={selectedDate}
                  time={selectedSlotData.time}
                  endTime={selectedSlotData.end_time}
                  duration={selectedSlotData.duration}
                  price={selectedSlotData.price || unitPrice || undefined}
                  category={category}
                  isYoga={isYoga}
                  pricingCards={pricingCards}
                  inclusions={selectedSlotData.inclusions}
                  longDescription={activity?.long_description}
                  shortDescription={activity?.description}
                  instructorName={instructorData?.name || activity?.instructor}
                  instructorPhoto={instructorData?.photo_url}
                  cardYogaCount={selectedSlotData.cardYogaCount}
                />
              )}

              {/* 2.2: Add extra participants */}
              <AddParticipant
                participants={extraParticipants}
                onChange={setExtraParticipants}
              />

              <h2 className="text-lg font-display font-semibold text-primary-dark">
                {isYoga ? "Options de réservation" : "Paiement"}
              </h2>

              <PurchaseOptions
                userState={userState}
                category={category}
                credits={currentProfile?.credits || 0}
                userName={currentProfile?.name || guestName || ""}
                pricingCards={pricingCards}
                unitPrice={unitPrice}
                onReserveWithCard={handleReserveWithCard}
                onBuyCard={handleBuyCard}
                onBuyUnit={handleBuyUnit}
                onUseVoucher={handleUseVoucher}
                onCreateAccount={() => setBookingStep("register")}
                voucherStatus={voucherStatus}
                onVoucherCodeChange={() => setVoucherStatus("idle")}
              />
            </div>
          )}

          {/* ═══ STEP: PAYMENT ═══ */}
          {bookingStep === "payment" && selectedSlotData && selectedDate && (
            <PaymentSummary
              activityName={selectedSlotData.name}
              date={selectedDate}
              time={selectedSlotData.time}
              endTime={selectedSlotData.end_time}
              mode={paymentMode}
              amount={paymentAmount}
              conditions={applicableConditions}
              conditionsAccepted={conditionsAccepted}
              onConditionsChange={setConditionsAccepted}
              onPay={handlePay}
              submitting={submitting}
              cardName={pendingCard?.name}
              cardSessions={pendingCard?.sessions}
              existingCredits={currentProfile?.credits || 0}
              mainParticipantName={currentProfile?.name || guestName || undefined}
              extraParticipants={extraParticipants}
            />
          )}
        </div>
      </main>
      <Footer />

      {/* Confirmation popup */}
      {bookingStep === "confirmed" && selectedSlotData && selectedDate && (
        <ConfirmationPopup
          open={true}
          activityName={selectedSlotData.name}
          date={selectedDate}
          time={selectedSlotData.time}
          isGuest={!currentProfile}
          onViewReservation={handleViewReservation}
        />
      )}

      {/* Mock Stripe */}
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
