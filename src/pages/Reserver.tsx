import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Info, ShoppingCart, Gift, Eye } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoContext } from "@/contexts/DemoContext";
import MockStripeModal from "@/components/demo/MockStripeModal";

import AccountChoice from "@/components/booking/AccountChoice";
import SignupBlock from "@/components/booking/SignupBlock";
import LoginBlock from "@/components/booking/LoginBlock";
import GuestForm from "@/components/booking/GuestForm";
import PurchaseOptions from "@/components/booking/PurchaseOptions";
import FormulaInfoModal from "@/components/booking/FormulaInfoModal";
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

type BookingStep = "date_picker" | "summary" | "login" | "register" | "registering" | "guest_form" | "purchase_options" | "payment" | "confirmed";

// ─── Week/Month navigation helpers ───
function getWeekOfDate(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", opts)}`;
}

function WorkshopDatePicker({ dates, onSelect }: {
  dates: { id: string; date: string; time: string; end_time: string; spots_left: number; price: number }[];
  onSelect: (ws: typeof dates[0]) => void;
}) {
  const [viewMode, setViewMode] = useState<"semaine" | "mois">("semaine");
  const [weekStart, setWeekStart] = useState(() => getWeekOfDate(new Date()).start);
  const [monthOffset, setMonthOffset] = useState(0);

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 6);
    return e;
  }, [weekStart]);

  const visibleDates = useMemo(() => {
    if (viewMode === "semaine") {
      return dates.filter(ws => {
        const d = new Date(ws.date + "T12:00:00");
        return d >= weekStart && d <= weekEnd;
      });
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
    return dates.filter(ws => {
      const d = new Date(ws.date + "T12:00:00");
      return d >= monthStart && d <= monthEnd;
    });
  }, [dates, viewMode, weekStart, weekEnd, monthOffset]);

  const monthLabel = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const l = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return l.charAt(0).toUpperCase() + l.slice(1);
  }, [monthOffset]);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button size="sm" variant={viewMode === "semaine" ? "default" : "outline"} className="text-xs h-7 px-2.5" onClick={() => setViewMode("semaine")}>Semaine</Button>
          <Button size="sm" variant={viewMode === "mois" ? "default" : "outline"} className="text-xs h-7 px-2.5" onClick={() => setViewMode("mois")}>Mois</Button>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
            if (viewMode === "semaine") { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
            else setMonthOffset(p => p - 1);
          }}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs font-medium min-w-[120px] text-center">
            {viewMode === "semaine" ? formatWeekLabel(weekStart, weekEnd) : monthLabel}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
            if (viewMode === "semaine") { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }
            else setMonthOffset(p => p + 1);
          }}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      {visibleDates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune date disponible sur cette période.</p>
      ) : (
        <div className="grid gap-2">
          {visibleDates.map(ws => {
            const d = new Date(ws.date + "T12:00:00");
            const label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
            const time = ws.time?.slice(0, 5).replace(":", "h");
            const endTime = ws.end_time?.slice(0, 5).replace(":", "h");
            return (
              <button key={ws.id} onClick={() => onSelect(ws)} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left">
                <div>
                  <span className="font-medium text-sm capitalize">{label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{time}–{endTime}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {ws.price > 0 && <span className="font-semibold">{ws.price}€</span>}
                  <span className={ws.spots_left <= 2 ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {ws.spots_left} place{ws.spots_left > 1 ? "s" : ""}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseDatePicker({ dates, onSelect }: {
  dates: { date: Date; schedule: CourseScheduleRow }[];
  onSelect: (d: Date, sched: CourseScheduleRow) => void;
}) {
  const [viewMode, setViewMode] = useState<"semaine" | "mois">("semaine");
  const [weekStart, setWeekStart] = useState(() => getWeekOfDate(new Date()).start);
  const [monthOffset, setMonthOffset] = useState(0);

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 6);
    return e;
  }, [weekStart]);

  const visibleDates = useMemo(() => {
    if (viewMode === "semaine") {
      return dates.filter(({ date: d }) => d >= weekStart && d <= weekEnd);
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59);
    return dates.filter(({ date: d }) => d >= monthStart && d <= monthEnd);
  }, [dates, viewMode, weekStart, weekEnd, monthOffset]);

  const monthLabel = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const l = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return l.charAt(0).toUpperCase() + l.slice(1);
  }, [monthOffset]);

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <Button size="sm" variant={viewMode === "semaine" ? "default" : "outline"} className="text-xs h-7 px-2.5" onClick={() => setViewMode("semaine")}>Semaine</Button>
          <Button size="sm" variant={viewMode === "mois" ? "default" : "outline"} className="text-xs h-7 px-2.5" onClick={() => setViewMode("mois")}>Mois</Button>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
            if (viewMode === "semaine") { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }
            else setMonthOffset(p => p - 1);
          }}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-xs font-medium min-w-[120px] text-center">
            {viewMode === "semaine" ? formatWeekLabel(weekStart, weekEnd) : monthLabel}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
            if (viewMode === "semaine") { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }
            else setMonthOffset(p => p + 1);
          }}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      {visibleDates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune date disponible sur cette période.</p>
      ) : (
        <div className="grid gap-2">
          {visibleDates.map(({ date: d, schedule: sched }, idx) => {
            const label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
            const time = sched.time?.slice(0, 5).replace(":", "h");
            const endTime = sched.end_time?.slice(0, 5).replace(":", "h");
            return (
              <button key={`${sched.id}-${idx}`} onClick={() => onSelect(d, sched)} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary hover:bg-primary/5 transition-colors text-left">
                <div>
                  <span className="font-medium text-sm capitalize">{label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{time}–{endTime}</span>
                </div>
                <span className={`text-xs ${sched.spots_left <= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {sched.spots_left} place{sched.spots_left > 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  const activityName = searchParams.get("name");
  const preselectedDate = searchParams.get("date");
  const preselectedScheduleId = searchParams.get("scheduleId");

  const [availableDates, setAvailableDates] = useState<{ id: string; date: string; time: string; end_time: string; spots_left: number; price: number }[]>([]);
  const [datePickerMode, setDatePickerMode] = useState(false);
  const [courseDatePickerMode, setCourseDatePickerMode] = useState(false);

  const [activity, setActivity] = useState<any>(null);
  const [schedules, setSchedules] = useState<CourseScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [isNewUser, setIsNewUser] = useState(false);
  const [instructorData, setInstructorData] = useState<{ name: string; photo_url: string } | null>(null);

  const [extraParticipants, setExtraParticipants] = useState<ExtraParticipant[]>([]);

  const [bookingStep, setBookingStep] = useState<BookingStep>("summary");
  const [registering, setRegistering] = useState(false);

  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeDescription, setStripeDescription] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [voucherStatus, setVoucherStatus] = useState<"idle" | "valid" | "invalid" | "checking">("idle");

  const [pendingCard, setPendingCard] = useState<PricingCard | null>(null);
  const [showActivityDetails, setShowActivityDetails] = useState(false);
  const [showFormulasInline, setShowFormulasInline] = useState(false);

  // Guest inline form state (visitor stays on page)
  const [guestFormVisible, setGuestFormVisible] = useState(false);
  const [guestSubmitted, setGuestSubmitted] = useState(false);

  // Voucher inline state for guest tarifs section
  const [showVoucherInline, setShowVoucherInline] = useState(false);
  const [voucherCodeInline, setVoucherCodeInline] = useState("");

  // ─── Browser back button handling ───
  const goToStep = useCallback((step: BookingStep) => {
    setBookingStep(step);
    window.history.pushState({ step }, "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Close formula modal if open
      if (showFormulasInline) {
        setShowFormulasInline(false);
        // Re-push current state so we don't lose it
        window.history.pushState({ step: bookingStep }, "");
        return;
      }
      const state = e.state as { step?: BookingStep } | null;
      if (state?.step) {
        setBookingStep(state.step);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        navigate("/", { replace: true });
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.history.replaceState({ step: "summary" }, "");
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate, showFormulasInline, bookingStep]);

  // Load data
  useEffect(() => {
    supabase.from("pricing_cards").select("*").order("sort_order").then(({ data }) => {
      if (data) setPricingCards(data as unknown as PricingCard[]);
    });
  }, []);

  useEffect(() => {
    if (!activityType) { setLoading(false); return; }
    if (!activityId && !activityName) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      if (activityType === "course") {
        const [courseRes, schedRes] = await Promise.all([
          supabase.from("courses").select("*").eq("id", activityId!).single(),
          supabase.from("course_schedules").select("*").eq("course_id", activityId!),
        ]);
        if (courseRes.data) {
          setActivity({ ...courseRes.data, type: "course" });
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
          } else if (scheds.length > 0) {
            setCourseDatePickerMode(true);
          }
        }
      } else if (activityType === "workshop" && activityName && !activityId) {
        const today = new Date().toISOString().split("T")[0];
        const { data: allWs } = await supabase
          .from("workshops").select("*")
          .eq("name", activityName)
          .gte("date", today)
          .order("date");
        if (allWs && allWs.length > 0) {
          const ws0 = allWs[0] as any;
          setActivity({ ...ws0, type: "workshop" });
          if (ws0.instructor_id) {
            const { data: instrData } = await supabase.from("instructors").select("name, photo_url").eq("id", ws0.instructor_id).single();
            if (instrData) setInstructorData(instrData as any);
          }
          const byDate = new Map<string, any>();
          for (const w of allWs as any[]) {
            if (w.date && !byDate.has(w.date)) byDate.set(w.date, w);
          }
          const uniqueDates = [...byDate.values()].sort((a: any, b: any) => a.date.localeCompare(b.date));
          setAvailableDates(uniqueDates.map((w: any) => ({
            id: w.id, date: w.date, time: w.time, end_time: w.end_time,
            spots_left: w.spots_left, price: w.price,
          })));
          setDatePickerMode(true);
        }
      } else if (activityId) {
        const res = await supabase.from("workshops").select("*").eq("id", activityId).single();
        if (res.data) {
          const wsData = res.data as any;
          setActivity({ ...wsData, type: "workshop" });
          
          if (wsData.linked_group) {
            const { data: linkedWs } = await supabase.from("workshops").select("*")
              .eq("linked_group", wsData.linked_group).order("date");
            if (linkedWs && linkedWs.length > 1) {
              const todayStr = new Date().toISOString().split("T")[0];
              const byDate = new Map<string, any>();
              for (const w of linkedWs as any[]) {
                if (w.date && w.date >= todayStr && !byDate.has(w.date)) byDate.set(w.date, w);
              }
              const dedupedLinkedWs = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
              const linkedDates = dedupedLinkedWs.map(w => w.date);
              const linkedIds = dedupedLinkedWs.map(w => w.id);
              setActivity((prev: any) => ({
                ...prev,
                linkedDates,
                linkedWorkshopIds: linkedIds,
                linkedWorkshops: dedupedLinkedWs,
              }));
              if (dedupedLinkedWs.length > 0) {
                setAvailableDates(dedupedLinkedWs.map((w: any) => ({
                  id: w.id, date: w.date, time: w.time, end_time: w.end_time,
                  spots_left: w.spots_left, price: w.price,
                })));
                setDatePickerMode(true);
              }
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
  }, [activityType, activityId, activityName, preselectedDate, preselectedScheduleId]);

  // Compute upcoming course dates from schedules
  const upcomingCourseDates = useMemo(() => {
    if (!activity || activity.type !== "course" || schedules.length === 0) return [];
    const dayMap: Record<string, number> = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates: { date: Date; schedule: CourseScheduleRow }[] = [];
    
    for (const sched of schedules) {
      const targetDay = dayMap[sched.day];
      if (targetDay === undefined) continue;
      for (let week = 0; week < 4; week++) {
        const d = new Date(today);
        let diff = targetDay - d.getDay();
        if (diff < 0) diff += 7;
        d.setDate(d.getDate() + diff + week * 7);
        if (d >= today) {
          dates.push({ date: d, schedule: sched });
        }
      }
    }
    return dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [activity, schedules]);

  const handleCourseDateSelect = (d: Date, sched: CourseScheduleRow) => {
    setSelectedDate(d);
    setSelectedSlot(sched.id);
    setCourseDatePickerMode(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

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
      if (activity.date === dateStr || (activity.linkedDates && activity.linkedDates.includes(dateStr))) {
        return [{
          id: activity.id, name: activity.name, time: activity.time,
          end_time: activity.end_time || "", duration: calcDuration(activity.time, activity.end_time || "") || activity.duration,
          spots: activity.spots, spotsLeft: activity.spots_left,
          type: "workshop" as const, sourceId: activity.id, price: activity.price,
          inclusions: activity.inclusions || "", cardYogaCount: activity.card_yoga_count || 0,
          linkedDates: activity.linkedDates || undefined,
          linkedWorkshopIds: activity.linkedWorkshopIds || undefined,
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

  type UserState = "guest" | "logged_user_no_cards" | "logged_user_with_cards";
  const userState: UserState = !currentProfile
    ? "guest"
    : (isYoga && currentProfile.credits > 0) ? "logged_user_with_cards"
    : "logged_user_no_cards";

  // Auto-advance when logged in — only if coming fresh (date already chosen, not guest)
  // REMOVED: This was causing logged-in clients to be "forgotten" or disconnected
  // The logged-in flow now stays on "summary" and shows the full sectioned view

  // Handle date selection from picker
  const handleDateSelect = (ws: typeof availableDates[0]) => {
    setSelectedDate(new Date(ws.date + "T00:00:00"));
    setSelectedSlot(ws.id);
    setActivity((prev: any) => ({ ...prev, id: ws.id, date: ws.date, time: ws.time, end_time: ws.end_time, spots_left: ws.spots_left, price: ws.price }));
    setDatePickerMode(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };

  // ─── Redirect if no params ───
  if (!loading && (!activityType || !activity)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réserver une activité</h1>
            <p className="text-muted-foreground mb-6">Choisissez une activité depuis notre planning pour commencer.</p>
            <Link to="/"><Button>Voir les activités</Button></Link>
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
    goToStep("registering");
    setTimeout(() => {
      createTempProfile(name);
      setIsNewUser(true);
      setRegistering(false);
      goToStep("purchase_options");
    }, 2000);
  };

  const handleLoginSelect = (profile: DemoProfile) => {
    setCurrentProfile(profile);
    setIsNewUser(false);
    goToStep("purchase_options");
  };

  const handleGuestContinue = (name: string) => {
    setGuestName(name);
    setGuestSubmitted(true);
  };

  const handleReserveWithCard = () => {
    setPaymentMode("1 carte yoga utilisée");
    setPaymentAmount(0);
    goToStep("payment");
  };

  const handleBuyCard = (card: PricingCard) => {
    setPendingCard(card);
    setPaymentMode(`Achat ${card.name}`);
    setPaymentAmount(card.price);
    setStripeAmount(card.price);
    setStripeDescription(`${card.name} — MyIgiStudio`);
    goToStep("payment");
  };

  const handleBuyUnit = () => {
    const totalParticipants = 1 + extraParticipants.filter(p => p.firstName.trim()).length;
    const price = activity?.type === "workshop" ? (activity.price || 35) : (unitPrice || 15);
    const totalPrice = price * totalParticipants;
    setPaymentMode("Cours à l'unité");
    setPaymentAmount(totalPrice);
    setStripeAmount(totalPrice);
    setStripeDescription(`${activity.name} — Cours à l'unité${totalParticipants > 1 ? ` (${totalParticipants} pers.)` : ""}`);
    goToStep("payment");
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
    goToStep("payment");
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
      addCredits(pendingCard.sessions - 1, pendingCard.name);
      addNotification(`${currentProfile?.name || guestName || "Client"} a acheté une ${pendingCard.name}`, "purchase");
      await supabase.from("client_cards").insert({
        client_name: currentProfile?.name || guestName || "Client",
        card_name: pendingCard.name,
        total_sessions: pendingCard.sessions,
        used_sessions: 1,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      } as any);
      toast({ title: `${pendingCard.name} achetée avec succès ! 🎉` });
      setPaymentMode("card_just_bought");
      setPendingCard(null);
    }
    handleFinalConfirm();
  };

  const handleFinalConfirm = async () => {
    if (!selectedSlotData || !selectedDate) return;
    setSubmitting(true);
    const clientName = currentProfile?.name || guestName || "Visiteur";
    const totalParticipants = 1 + extraParticipants.filter(p => p.firstName.trim()).length;
    const notesStr = extraParticipants.filter(p => p.firstName.trim()).map(p => `Invité: ${p.firstName} ${p.lastName}`).join(", ");
    const spotsToDecrement = totalParticipants;

    const datesToBook: { dateStr: string; workshopId?: string }[] = [];
    
    if (selectedSlotData.linkedDates && selectedSlotData.linkedDates.length > 1 && activity?.linkedWorkshops) {
      const uniqueByDate = new Map<string, any>();
      for (const ws of activity.linkedWorkshops as any[]) {
        if (ws.date && !uniqueByDate.has(ws.date)) {
          uniqueByDate.set(ws.date, ws);
        }
      }
      for (const ws of uniqueByDate.values()) {
        datesToBook.push({ dateStr: ws.date, workshopId: ws.id });
      }
    } else {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      datesToBook.push({ dateStr, workshopId: selectedSlotData.type === "workshop" ? selectedSlotData.sourceId : undefined });
    }

    for (const { dateStr, workshopId } of datesToBook) {
      await supabase.from("reservations").insert({
        client_name: clientName,
        activity_name: selectedSlotData.name,
        activity_type: selectedSlotData.type,
        course_id: selectedSlotData.type === "course" ? selectedSlotData.sourceId : null,
        workshop_id: workshopId || null,
        schedule_id: selectedSlotData.scheduleId || null,
        date: dateStr,
        time: selectedSlotData.time,
        end_time: selectedSlotData.end_time,
        participants: totalParticipants,
        status: "confirmé",
        notes: notesStr,
      } as any);

      if (selectedSlotData.scheduleId) {
        await supabase.from("course_schedules").update({ spots_left: selectedSlotData.spotsLeft - spotsToDecrement }).eq("id", selectedSlotData.scheduleId);
      } else if (workshopId) {
        await supabase.from("workshops").update({ spots_left: (selectedSlotData.spotsLeft || 0) - spotsToDecrement } as any).eq("id", workshopId);
      }
    }

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

    addReservation(selectedSlotData.name, datesToBook[0].dateStr, selectedSlotData.time);
    const dateLabel = datesToBook.length > 1 
      ? `${datesToBook.length} dates` 
      : selectedDate.toLocaleDateString("fr-FR");
    addNotification(`${clientName} a réservé ${selectedSlotData.name} du ${dateLabel}${totalParticipants > 1 ? ` (${totalParticipants} pers.)` : ""}`, "reservation");
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

  // Determine if we're in date picker phase
  const isDatePhase = datePickerMode || courseDatePickerMode;
  const hasChosenDate = !!selectedDate && !!selectedSlotData;

  // Back handler
  const handleBack = () => {
    if (bookingStep === "login" || bookingStep === "register" || bookingStep === "guest_form") {
      goToStep("summary");
    } else if (bookingStep === "purchase_options") {
      if (!currentProfile && !guestName) goToStep("summary");
      else {
        if (availableDates.length > 0) {
          setDatePickerMode(true);
          setSelectedDate(undefined);
          setSelectedSlot("");
        } else if (upcomingCourseDates.length > 0) {
          setCourseDatePickerMode(true);
          setSelectedDate(undefined);
          setSelectedSlot("");
        } else {
          window.history.back();
        }
      }
    } else if (bookingStep === "payment") {
      goToStep("purchase_options");
    } else if (bookingStep === "summary" && hasChosenDate) {
      if (availableDates.length > 0) {
        setDatePickerMode(true);
        setSelectedDate(undefined);
        setSelectedSlot("");
      } else if (upcomingCourseDates.length > 0) {
        setCourseDatePickerMode(true);
        setSelectedDate(undefined);
        setSelectedSlot("");
      } else {
        window.history.back();
      }
    } else {
      window.history.back();
    }
  };

  // Activity info block
  const ActivityInfoBlock = () => (
    <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
      {activity?.description && (
        <p className="text-xs text-muted-foreground">{activity.description}</p>
      )}
      {(activity?.long_description || instructorData?.name || activity?.instructor) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs font-medium"
          onClick={() => setShowActivityDetails(!showActivityDetails)}
        >
          {showActivityDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showActivityDetails ? "Masquer les détails" : "Afficher plus d'informations"}
        </Button>
      )}
      {showActivityDetails && (
        <div className="space-y-3 pt-2 border-t mt-2">
          {activity?.long_description && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Description détaillée</p>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{activity.long_description}</p>
            </div>
          )}
          {(instructorData?.name || activity?.instructor) && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {instructorData?.photo_url ? <AvatarImage src={instructorData.photo_url} alt={instructorData.name} /> : null}
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(instructorData?.name || activity?.instructor || "I").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium">{instructorData?.name || activity?.instructor}</p>
                <p className="text-[10px] text-muted-foreground">Intervenant(e)</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Date info block
  const DateInfoBlock = () => {
    if (!selectedSlotData || !selectedDate) return null;
    return (
      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          {selectedSlotData.linkedDates && selectedSlotData.linkedDates.length > 1 ? (
            <div className="text-right">
              {[...new Set(selectedSlotData.linkedDates)].map(d => (
                <div key={d} className="font-medium">
                  {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
                </div>
              ))}
            </div>
          ) : (
            <span className="font-medium">{selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Horaire</span>
          <span className="font-medium">{selectedSlotData.time?.slice(0, 5).replace(":", "h")} - {selectedSlotData.end_time?.slice(0, 5).replace(":", "h")}</span>
        </div>
        {selectedSlotData.duration && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Durée</span>
            <span className="font-medium">{selectedSlotData.duration}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lieu</span>
          <span className="font-medium">Studio MyIgi</span>
        </div>
      </div>
    );
  };

  // Tarif block for visitor guest
  const GuestTarifBlock = () => {
    if (!selectedSlotData) return null;
    const totalParticipants = 1 + extraParticipants.filter(p => p.firstName.trim()).length;
    const price = selectedSlotData.price || unitPrice || undefined;
    return (
      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prix unitaire</span>
          <span className="font-semibold text-foreground">{price} €</span>
        </div>
        {totalParticipants > 1 && price && (
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="text-muted-foreground">Total ({totalParticipants} participants)</span>
            <span className="font-semibold text-foreground">{(price * totalParticipants)} €</span>
          </div>
        )}
        {selectedSlotData.inclusions && (
          <div className="bg-emerald-50 rounded-md px-3 py-2 text-xs text-emerald-700 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{selectedSlotData.inclusions}</span>
          </div>
        )}
      </div>
    );
  };

  // Tarif block for logged-in user
  const TarifBlock = () => {
    if (!selectedSlotData) return null;
    const totalParticipants = 1 + extraParticipants.filter(p => p.firstName.trim()).length;
    const price = selectedSlotData.price || unitPrice || undefined;
    return (
      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Prix unitaire</span>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            {price} €
            {isYoga && pricingCards.length > 0 && (
              <button
                className="inline-flex items-center gap-1 text-xs font-normal text-primary hover:underline"
                onClick={() => setShowFormulasInline(true)}
              >
                ou 1 carte <Info className="h-3 w-3" />
              </button>
            )}
          </span>
        </div>
        {totalParticipants > 1 && price && (
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="text-muted-foreground">Total ({totalParticipants} participants)</span>
            <span className="font-semibold text-foreground">
              {(price * totalParticipants)} € {isYoga && pricingCards.length > 0 && `ou ${totalParticipants} cartes`}
            </span>
          </div>
        )}
        {selectedSlotData.inclusions && (
          <div className="bg-emerald-50 rounded-md px-3 py-2 text-xs text-emerald-700 flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{selectedSlotData.inclusions}</span>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-lg">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" className="mb-2 gap-1.5" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            
            {/* Step 1: Activity name */}
            <p className="text-sm font-semibold text-foreground mb-2">
              1. Votre activité : {activity.name}
            </p>
            <ActivityInfoBlock />

            {currentProfile && (
              <p className="text-xs text-primary-dark font-medium mt-2">
                Connecté en tant que <strong>{currentProfile.name}</strong>
              </p>
            )}
            {!currentProfile && guestName && (
              <p className="text-xs text-muted-foreground mt-2">
                Invité : <strong>{guestName}</strong>
              </p>
            )}
          </div>

          {/* ═══ DATE PICKER for standalone workshops ═══ */}
          {datePickerMode && availableDates.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">2. Choisissez votre date</p>
              <WorkshopDatePicker dates={availableDates} onSelect={handleDateSelect} />
            </div>
          )}

          {/* ═══ COURSE DATE PICKER ═══ */}
          {courseDatePickerMode && upcomingCourseDates.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">2. Choisissez votre date</p>
              <CourseDatePicker dates={upcomingCourseDates} onSelect={handleCourseDateSelect} />
            </div>
          )}

          {/* ═══ STEP: SUMMARY (visitor not logged in, date chosen) ═══ */}
          {!datePickerMode && !courseDatePickerMode && bookingStep === "summary" && !currentProfile && (
            <div className="space-y-6">
              {selectedSlotData && selectedDate && (
                <>
                  {/* Section 2: Date */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">2. Votre date</p>
                    <DateInfoBlock />
                  </div>

                  {/* Section 3: Participant(s) */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">3. Participant(s)</p>
                    <div className="rounded-lg bg-muted/50 p-4 space-y-4">
                      <AddParticipant
                        participants={extraParticipants}
                        onChange={setExtraParticipants}
                      />

                      {/* Guest form inline OR account choice */}
                      {!guestFormVisible && !guestSubmitted && (
                        <AccountChoice
                          onLogin={() => goToStep("login")}
                          onRegister={() => goToStep("register")}
                          onGuest={() => setGuestFormVisible(true)}
                        />
                      )}

                      {guestFormVisible && !guestSubmitted && (
                        <GuestForm
                          onSubmit={handleGuestContinue}
                          onBack={() => {}}
                          hideBack
                        />
                      )}

                      {guestSubmitted && (
                        <div className="rounded-lg border bg-card p-3 text-sm text-center text-muted-foreground">
                          Invité : <strong className="text-foreground">{guestName}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Tarifs (only after guest submitted) */}
                  {guestSubmitted && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">4. Tarif</p>
                      <GuestTarifBlock />

                      <div className="grid gap-2 mt-4">
                        <Button onClick={handleBuyUnit} className="w-full gap-2 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90">
                          <ShoppingCart className="h-4 w-4" /> Procéder au paiement
                        </Button>
                        <Button variant="outline" className="w-full gap-2" onClick={() => setShowVoucherInline(!showVoucherInline)}>
                          <Gift className="h-4 w-4" /> Utiliser un bon cadeau
                        </Button>
                        {showVoucherInline && (
                          <div className="rounded-lg border bg-card p-4 space-y-3">
                            <p className="text-sm font-medium text-primary-dark flex items-center gap-1.5">
                              <Gift className="h-4 w-4" /> Saisir un code bon cadeau
                            </p>
                            <div className="flex gap-2">
                              <input
                                placeholder="IGI-XXXXXXXX"
                                value={voucherCodeInline}
                                onChange={e => { setVoucherCodeInline(e.target.value.toUpperCase()); setVoucherStatus("idle"); }}
                                className="flex-1 rounded-md border px-3 py-2 text-sm font-mono"
                              />
                              <Button size="sm" variant="outline" disabled={!voucherCodeInline.trim() || voucherStatus === "checking"} onClick={() => handleUseVoucher(voucherCodeInline)}>
                                {voucherStatus === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
                              </Button>
                            </div>
                            {voucherStatus === "invalid" && <p className="text-xs text-destructive">Code invalide, expiré ou déjà utilisé</p>}
                          </div>
                        )}
                        {isYoga && pricingCards.length > 0 && (
                          <Button variant="outline" className="w-full gap-2" onClick={() => setShowFormulasInline(true)}>
                            <Eye className="h-4 w-4" /> Voir les formules carte yoga
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ STEP: LOGIN ═══ */}
          {bookingStep === "login" && !currentProfile && (
            <LoginBlock onSelect={handleLoginSelect} onBack={() => goToStep("summary")} />
          )}

          {/* ═══ STEP: REGISTER ═══ */}
          {(bookingStep === "register" || bookingStep === "registering") && !currentProfile && (
            <SignupBlock onSubmit={handleRegister} onBack={() => goToStep("summary")} registering={registering} />
          )}

          {/* ═══ STEP: PURCHASE OPTIONS (logged in users) ═══ */}
          {bookingStep === "purchase_options" && (
            <div className="space-y-6">
              {selectedSlotData && selectedDate && (
                <>
                  {/* Section 2: Date */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">2. Votre date</p>
                    <DateInfoBlock />
                  </div>

                  {/* Section 3: Add participant */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">3. Participant(s)</p>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <AddParticipant
                        participants={extraParticipants}
                        onChange={setExtraParticipants}
                      />
                    </div>
                  </div>

                  {/* Section 4: Tarif */}
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">4. Tarif</p>
                    <TarifBlock />
                  </div>
                </>
              )}

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
                onCreateAccount={() => goToStep("register")}
                voucherStatus={voucherStatus}
                onVoucherCodeChange={() => setVoucherStatus("idle")}
              />

              {isYoga && pricingCards.length > 0 && (
                <FormulaInfoModal
                  open={showFormulasInline}
                  onClose={() => setShowFormulasInline(false)}
                  onCreateAccount={() => { setShowFormulasInline(false); goToStep("register"); }}
                  onContinueWithout={() => setShowFormulasInline(false)}
                  pricingCards={pricingCards}
                  unitPrice={unitPrice || undefined}
                />
              )}
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

          {/* Formula modal for guest tarifs section */}
          {isYoga && pricingCards.length > 0 && bookingStep === "summary" && (
            <FormulaInfoModal
              open={showFormulasInline}
              onClose={() => setShowFormulasInline(false)}
              onCreateAccount={() => { setShowFormulasInline(false); goToStep("register"); }}
              onContinueWithout={() => setShowFormulasInline(false)}
              pricingCards={pricingCards}
              unitPrice={unitPrice || undefined}
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
