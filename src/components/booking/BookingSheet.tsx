import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Users, Euro, CreditCard, Minus, Plus,
  ChevronRight, ChevronLeft, Sparkles, Gift, Ticket, Info, Check, Trash2, ArrowLeft, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemoContext } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MockStripeModal from "@/components/demo/MockStripeModal";
import LoginBlock from "@/components/booking/LoginBlock";
import SignupBlock from "@/components/booking/SignupBlock";
import YogaFormulasBlock, { YogaFormulasPricingCard } from "@/components/YogaFormulasBlock";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

const DAY_INDEX: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

function nextDatesForCourse(schedules: Schedule[], count = 8) {
  const out: { date: string; time: string; end_time: string; scheduleId: string }[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && out.length < count; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dow = d.getDay();
    for (const s of schedules) {
      const idx = DAY_INDEX[(s.day || "").toLowerCase()];
      if (idx === dow) out.push({ date: d.toISOString().split("T")[0], time: s.time, end_time: s.end_time, scheduleId: s.id });
    }
  }
  return out;
}

// A method describes how the booking is paid/used. Each cart item embeds capacity.
type CartItemMethod =
  | { kind: "unit"; price: number }
  | { kind: "formula"; cardId: string; cardName: string; sessions: number; price: number }
  | { kind: "voucher"; code: string }
  | { kind: "existing_card"; cardName: string };

interface CartItem {
  id: string;
  method: CartItemMethod;
  capacity: number; // total sessions this item provides
}

interface Participant {
  name: string;
  isMe: boolean;
}

interface BookingSheetProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
  workshop?: Workshop | null;
  schedules?: Schedule[];
  workshopsList?: Workshop[];
  unitPrice?: number | null;
}

const newId = () => Math.random().toString(36).slice(2, 10);

function methodLabel(m: CartItemMethod): string {
  if (m.kind === "unit") return `Carte à l'unité — ${m.price} €`;
  if (m.kind === "formula") return `Formule "${m.cardName}" (${m.sessions} cartes) — ${m.price} €`;
  if (m.kind === "voucher") return `Bon cadeau ${m.code}`;
  return `Carte du compte`;
}

function methodShort(m: CartItemMethod): string {
  if (m.kind === "unit") return "Carte unité";
  if (m.kind === "formula") return `Formule ${m.cardName}`;
  if (m.kind === "voucher") return `Bon ${m.code}`;
  return "Carte du compte";
}

export default function BookingSheet({
  open, onClose, course, workshop, schedules = [], workshopsList = [], unitPrice,
}: BookingSheetProps) {
  const { toast } = useToast();
  const { currentProfile, addReservation, addNotification, addCredits, useCredit, setCurrentProfile, createTempProfile } = useDemoContext();
  const isYoga = !!course;

  const dates = useMemo(() => {
    if (workshop) {
      return workshopsList
        .filter((w) => w.name === workshop.name && new Date(w.date) >= new Date(new Date().toDateString()))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((w) => ({ date: w.date, time: w.time, end_time: w.end_time, scheduleId: w.id }));
    }
    if (course) return nextDatesForCourse(schedules);
    return [];
  }, [course, workshop, schedules, workshopsList]);

  const [step, setStep] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  // Cart of tariff items chosen by user
  const [cart, setCart] = useState<CartItem[]>([]);
  // assignments[participantIdx] = cartItem.id
  const [assignments, setAssignments] = useState<Record<number, string | null>>({});
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [pricingCards, setPricingCards] = useState<YogaFormulasPricingCard[]>([]);
  const [guestMode, setGuestMode] = useState(false);
  const [conditionsList, setConditionsList] = useState<{ id: string; title: string; content: string }[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingFormula, setPendingFormula] = useState<YogaFormulasPricingCard | null>(null);
  const [formulaAuthConfirm, setFormulaAuthConfirm] = useState<YogaFormulasPricingCard | null>(null);
  const [authMode, setAuthMode] = useState<null | "login" | "signup">(null);
  const [registering, setRegistering] = useState(false);
  const [showStripe, setShowStripe] = useState(false);

  // Init on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedIdx(0);
    setConditionsAccepted(false);
    setCart([]);
    setAssignments({});
    setGuestMode(false);
    setParticipants([{ name: currentProfile?.name || "", isMe: !!currentProfile }]);
  }, [open]);

  // Sync participant 0 if profile changes mid-session
  useEffect(() => {
    if (!open) return;
    setParticipants((prev) => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return [{ name: currentProfile?.name || first.name, isMe: !!currentProfile }, ...rest];
    });
  }, [currentProfile?.id, currentProfile?.name, open]);

  useEffect(() => {
    if (!open || !isYoga) return;
    supabase
      .from("pricing_cards")
      .select("id,name,sessions,price,validity,popular,payment_info,sort_order")
      .order("sort_order")
      .then(({ data }) => { if (data) setPricingCards(data as any); });
  }, [open, isYoga]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("conditions")
      .select("id,title,content,sort_order,active,applies_to")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return;
        const applies = isYoga ? "yoga" : "poterie";
        const filtered = (data as any[]).filter(
          (c) => !c.applies_to || c.applies_to.length === 0 || c.applies_to.includes(applies) || c.applies_to.includes("all")
        );
        setConditionsList(filtered as any);
      });
  }, [open, isYoga]);

  const selected = dates[selectedIdx];
  const pricePerUnit = isYoga ? unitPrice ?? 0 : (workshop?.price ?? 0);

  const setParticipantCount = (n: number) => {
    setParticipants((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ name: "", isMe: false });
      while (next.length > n) {
        const removedIdx = next.length - 1;
        next.pop();
        setAssignments((a) => { const c = { ...a }; delete c[removedIdx]; return c; });
      }
      return next;
    });
  };

  const updateParticipantName = (i: number, name: string) => {
    setParticipants((prev) => prev.map((p, idx) => idx === i ? { ...p, name } : p));
  };

  // ---- Cart helpers ----
  const cartCapacity = useMemo(() => cart.reduce((s, c) => s + c.capacity, 0), [cart]);

  const slotsUsed = (itemId: string) =>
    Object.values(assignments).filter((id) => id === itemId).length;

  const addCartItem = (method: CartItemMethod, capacity: number) => {
    setCart((c) => [...c, { id: newId(), method, capacity }]);
  };

  const removeCartItem = (id: string) => {
    setCart((c) => c.filter((x) => x.id !== id));
    setAssignments((a) => {
      const next: Record<number, string | null> = {};
      Object.entries(a).forEach(([k, v]) => {
        next[Number(k)] = v === id ? null : v;
      });
      return next;
    });
  };

  // Total to pay: sum prices (formula price counted once per item; voucher/existing_card = 0)
  const totalToPay = useMemo(() => {
    let t = 0;
    cart.forEach((ci) => {
      if (ci.method.kind === "unit") t += ci.method.price;
      else if (ci.method.kind === "formula") t += ci.method.price;
    });
    return t;
  }, [cart]);

  const allAssigned = participants.length > 0 && participants.every((_, i) => !!assignments[i]);

  // ---- Step gating ----
  const identityChosen = !!currentProfile || guestMode;
  const canNext = () => {
    if (step === 1) return !!selected;
    if (step === 2) return identityChosen && (participants[0]?.name.trim().length > 0);
    if (step === 3) return participants.length > 0 && participants.every((p) => p.name.trim().length > 0);
    if (step === 4) return cart.length > 0;
    if (step === 5) return allAssigned;
    return true;
  };

  const STEPS = [
    { n: 1, label: "Date", icon: CalendarDays },
    { n: 2, label: "Qui réserve ?", icon: Users },
    { n: 3, label: "Participants", icon: Users },
    { n: 4, label: "Vos achats", icon: ShoppingBag },
    { n: 5, label: "Attribution", icon: Euro },
    { n: 6, label: "Paiement", icon: CreditCard },
  ];

  // ---- Auth ----
  const handleSignupSubmit = (name: string) => {
    setRegistering(true);
    setTimeout(() => {
      createTempProfile(name);
      setRegistering(false);
      setAuthMode(null);
      toast({ title: "Compte créé ✓", description: "Vous pouvez maintenant choisir une formule." });
      setStep(4);
      if (pendingFormula) {
        setTimeout(() => setPickerOpen(true), 50);
      }
    }, 1200);
  };

  // ---- Finalize ----
  const finalize = async () => {
    if (!selected) return;
    const name = course?.name || workshop?.name || "";
    // For each formula in cart, give full sessions credit to user account (leftover slots become available credits)
    cart.forEach((ci) => {
      if (ci.method.kind === "formula") {
        const used = slotsUsed(ci.id);
        const remaining = Math.max(0, ci.capacity - used);
        // The user buys the full formula; we credit the full pack and immediately "use" the assigned ones
        addCredits(ci.capacity, `Carte ${ci.method.cardName}`);
        for (let k = 0; k < used; k++) useCredit();
        // remaining stays on account, no action needed
      } else if (ci.method.kind === "existing_card") {
        useCredit();
      }
    });
    addReservation(name, selected.date, selected.time);
    addNotification(`${currentProfile?.name || "Un client"} a réservé ${name} (${participants.length} pers.)`, "reservation");
    try {
      await supabase.from("reservations").insert({
        client_name: currentProfile?.name || "Invité",
        activity_name: name,
        activity_type: course ? "course" : "workshop",
        date: selected.date,
        time: selected.time,
        end_time: selected.end_time,
        participants: participants.length,
        status: "confirmé",
        course_id: course?.id || null,
        workshop_id: workshop?.id || null,
      } as any);
    } catch {}
    toast({ title: "Réservation confirmée ✓", description: `${name} — ${new Date(selected.date).toLocaleDateString("fr-FR")} à ${selected.time}` });
    onClose();
  };

  const handleConfirmPayment = () => {
    if (totalToPay > 0) setShowStripe(true);
    else finalize();
  };

  const activityName = course?.name || workshop?.name || "";

  const rootRef = useRef<HTMLDivElement>(null);
  const isFirstStepRender = useRef(true);

  // Scroll into view only when step changes (not on first open)
  useEffect(() => {
    if (!open) { isFirstStepRender.current = true; return; }
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    if (rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [step, open]);

  // Browser back sync
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ bookingStep: step }, "");
    const handler = (e: PopStateEvent) => {
      const target = (e.state && (e.state as any).bookingStep) as number | undefined;
      if (typeof target === "number" && target >= 1 && target <= 6) {
        setStep(target);
      } else {
        setStep((s) => {
          const next = Math.max(1, s - 1);
          window.history.pushState({ bookingStep: next }, "");
          return next;
        });
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const prevStepRef = useRef(step);
  useEffect(() => {
    if (!open) return;
    if (prevStepRef.current !== step) {
      window.history.pushState({ bookingStep: step }, "");
      prevStepRef.current = step;
    }
  }, [step, open]);

  if (!open) return null;

  // ---- Smart summary lines (Step 5 + Step 6) ----
  const summaryLines = cart.map((ci) => {
    const used = slotsUsed(ci.id);
    const remaining = Math.max(0, ci.capacity - used);
    const usedBy = participants
      .map((p, i) => assignments[i] === ci.id ? (p.isMe ? `Moi (${p.name})` : (p.name || `Participant ${i + 1}`)) : null)
      .filter(Boolean) as string[];
    let line = "";
    if (ci.method.kind === "formula") {
      line = `Formule "${ci.method.cardName}" (${ci.capacity} cartes) — ${ci.method.price} €. ${used} carte${used > 1 ? "s" : ""} utilisée${used > 1 ? "s" : ""}${usedBy.length ? " : " + usedBy.join(", ") : ""}.`;
      if (remaining > 0) line += ` ${remaining} carte${remaining > 1 ? "s" : ""} crédité${remaining > 1 ? "es" : "e"} sur votre compte.`;
    } else if (ci.method.kind === "unit") {
      line = `Carte à l'unité — ${ci.method.price} €${usedBy.length ? ` (${usedBy.join(", ")})` : ""}.`;
    } else if (ci.method.kind === "voucher") {
      line = `Bon cadeau ${ci.method.code}${usedBy.length ? ` — utilisé par ${usedBy.join(", ")}` : ""}.`;
    } else {
      line = `1 carte du compte${usedBy.length ? ` — utilisée par ${usedBy.join(", ")}` : ""}.`;
    }
    return { id: ci.id, line, remaining: ci.method.kind === "formula" ? remaining : 0 };
  });

  return (
    <>
      <div
        ref={rootRef}
        className="mb-4 rounded-2xl border bg-card shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold text-primary-dark">
              Réservation
            </h2>
            {selected && (
              <p className="text-[11px] text-muted-foreground capitalize">
                {new Date(selected.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {selected.time?.slice(0, 5)}
              </p>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <button
                  onClick={() => { if (s.n < step) setStep(s.n); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold transition-all ${
                    step === s.n
                      ? "bg-primary text-primary-foreground"
                      : s.n < step
                        ? "bg-primary/10 text-primary-dark"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.n}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${s.n < step ? "bg-primary/30" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {/* STEP 1 — Date */}
              {step === 1 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">Choisissez votre date</h3>
                  {dates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune date disponible.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {dates.map((d, i) => {
                        const dt = new Date(d.date + "T12:00:00");
                        return (
                          <button
                            key={`${d.scheduleId}-${d.date}`}
                            onClick={() => setSelectedIdx(i)}
                            className={`text-left rounded-xl border p-3 text-sm transition-all ${
                              i === selectedIdx ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                            }`}
                          >
                            <div className="font-medium capitalize text-xs">
                              {dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                            </div>
                            <div className="text-[11px] opacity-80 mt-0.5">{d.time?.slice(0, 5)}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 — Qui réserve ? */}
              {step === 2 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold">Qui réserve ?</h3>
                  {(() => {
                    const p = participants[0];
                    if (!p) return null;
                    return (
                      <div className="rounded-lg border bg-card p-3">
                        <Label className="text-[11px] text-muted-foreground">Réservant</Label>
                        {p.isMe ? (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-medium">Moi — {p.name}</span>
                            <Badge variant="secondary" className="text-[10px]">Connecté</Badge>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2">
                            <Input
                              placeholder="Votre prénom"
                              value={p.name}
                              onChange={(e) => updateParticipantName(0, e.target.value)}
                            />
                            {!guestMode ? (
                              <>
                                <p className="text-[11px] text-muted-foreground">
                                  Choisissez une option pour continuer :
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setAuthMode("login")}>
                                    Se connecter
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setAuthMode("signup")}>
                                    Créer un compte
                                  </Button>
                                  <Button size="sm" variant="ghost" className="border border-dashed" onClick={() => setGuestMode(true)}>
                                    Continuer sans compte
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px]">Mode invité</Badge>
                                <button onClick={() => setGuestMode(false)} className="underline hover:text-foreground">
                                  Changer
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 3 — Participants */}
              {step === 3 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Ajouter des participants</h3>
                    <div className="inline-flex items-center gap-2 rounded-lg border bg-background p-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setParticipantCount(Math.max(1, participants.length - 1))}
                        disabled={participants.length <= 1}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-sm font-semibold min-w-[20px] text-center">{participants.length}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setParticipantCount(participants.length + 1)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {participants.map((p, i) => (
                      <div key={i} className="rounded-lg border bg-card p-3">
                        <Label className="text-[11px] text-muted-foreground">Participant {i + 1}</Label>
                        {i === 0 ? (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {p.isMe ? `Moi — ${p.name}` : p.name || "—"}
                            </span>
                            {p.isMe && <Badge variant="secondary" className="text-[10px]">Connecté</Badge>}
                            {!p.isMe && guestMode && <Badge variant="secondary" className="text-[10px]">Invité</Badge>}
                          </div>
                        ) : (
                          <Input
                            className="mt-1"
                            placeholder="Prénom"
                            value={p.name}
                            onChange={(e) => updateParticipantName(i, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                    {participants.length === 1 && (
                      <p className="text-[11px] text-muted-foreground">
                        Vous pouvez continuer seul·e ou cliquer sur + pour ajouter des participants.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4 — Tarifs (panier) */}
              {step === 4 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Vos achats</h3>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Ajoutez les tarifs, formules ou bons cadeaux que vous souhaitez utiliser. L'attribution aux participants se fera à l'étape suivante.
                  </p>

                  {cart.length > 0 && (
                    <div className="space-y-2">
                      {cart.map((ci) => (
                        <div key={ci.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{methodLabel(ci.method)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {ci.capacity} place{ci.capacity > 1 ? "s" : ""}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCartItem(ci.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => setPickerOpen(true)}
                    className="w-full gap-2"
                    variant={cartCapacity >= participants.length ? "outline" : "default"}
                  >
                    <Sparkles className="h-4 w-4" />
                    {cart.length === 0 ? "Ajouter un tarif" : "Ajouter un autre tarif"}
                  </Button>

                  {totalToPay > 0 && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                      Total à régler : <strong>{totalToPay} €</strong>
                    </div>
                  )}

                  {cartCapacity < participants.length && cart.length > 0 && (
                    <p className="text-xs text-amber-700">
                      Il manque {participants.length - cartCapacity} place{participants.length - cartCapacity > 1 ? "s" : ""}.
                      Ajoutez un tarif pour continuer.
                    </p>
                  )}
                </div>
              )}

              {/* STEP 5 — Attribution & récap intelligent */}
              {step === 5 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">Attribuer vos achats aux participants</h3>

                  <div className="space-y-2">
                    {participants.map((p, i) => {
                      const currentId = assignments[i] || "";
                      return (
                        <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                          <Label className="text-[11px] text-muted-foreground">
                            {p.isMe ? `Moi — ${p.name}` : p.name || `Participant ${i + 1}`}
                          </Label>
                          <Select
                            value={currentId}
                            onValueChange={(v) => setAssignments((a) => ({ ...a, [i]: v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Choisir un tarif" /></SelectTrigger>
                            <SelectContent>
                              {cart.map((ci) => {
                                const used = slotsUsed(ci.id);
                                const available = ci.capacity - used + (currentId === ci.id ? 1 : 0);
                                const disabled = available <= 0;
                                return (
                                  <SelectItem key={ci.id} value={ci.id} disabled={disabled}>
                                    {methodShort(ci.method)} — {available}/{ci.capacity} dispo.
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                      Récapitulatif
                    </p>
                    {summaryLines.map((s) => (
                      <p key={s.id} className="text-xs leading-relaxed">{s.line}</p>
                    ))}
                    <div className="border-t pt-1.5 mt-1.5 flex justify-between text-sm">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold">{totalToPay} €</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6 — Conditions + Paiement */}
              {step === 6 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">Récapitulatif & paiement</h3>

                  <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{activityName}</p>
                        {selected && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {new Date(selected.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {selected.time?.slice(0, 5)}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">{participants.length} pers.</Badge>
                    </div>
                    <div className="space-y-1.5 text-xs border-t pt-2">
                      {summaryLines.map((s) => (
                        <p key={s.id} className="leading-relaxed">{s.line}</p>
                      ))}
                    </div>
                    <div className="border-t pt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">Total à régler</span>
                      <span className="text-lg font-bold">{totalToPay} €</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 max-h-56 overflow-y-auto divide-y">
                    {conditionsList.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        En réservant, vous acceptez les conditions de réservation et d'annulation de MyIgiStudio.
                      </p>
                    ) : (
                      conditionsList.map((c) => (
                        <details key={c.id} className="group">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-primary-dark flex items-center justify-between hover:bg-muted/50">
                            <span>{c.title}</span>
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                          </summary>
                          <p className="px-3 pb-3 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                            {c.content}
                          </p>
                        </details>
                      ))
                    )}
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={conditionsAccepted}
                      onCheckedChange={(c) => setConditionsAccepted(!!c)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">J'ai lu et j'accepte l'ensemble des conditions</span>
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          ) : <span />}
          {step < 6 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Continuer <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleConfirmPayment} disabled={!conditionsAccepted} className="gap-2">
              <CreditCard className="h-4 w-4" />
              {totalToPay > 0 ? `Confirmer le paiement (${totalToPay} €)` : "Confirmer la réservation"}
            </Button>
          )}
        </div>
      </div>

      {/* Picker modal — adds items to cart */}
      <CartPickerModal
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPendingFormula(null); }}
        isYoga={isYoga}
        unitPrice={pricePerUnit}
        pricingCards={pricingCards}
        existingCards={currentProfile?.credits || 0}
        isConnected={!!currentProfile}
        cart={cart}
        onAdd={(method, capacity) => {
          addCartItem(method, capacity);
          setPickerOpen(false);
        }}
        onRequireAuth={(formula) => {
          setPendingFormula(formula);
          setPickerOpen(false);
          setFormulaAuthConfirm(formula);
        }}
      />

      {/* Confirm-auth popup before formula signup */}
      <Dialog open={!!formulaAuthConfirm} onOpenChange={(v) => !v && setFormulaAuthConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Compte requis
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Les formules nécessitent de créer un compte (pour conserver vos cartes et votre historique).
            Voulez-vous créer un compte&nbsp;?
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => { setFormulaAuthConfirm(null); setPendingFormula(null); setPickerOpen(true); }}>
              Retour
            </Button>
            <Button onClick={() => { setFormulaAuthConfirm(null); setAuthMode("signup"); }}>
              Créer un compte
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth dialog (inline) */}
      <Dialog open={!!authMode} onOpenChange={(v) => !v && setAuthMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{authMode === "signup" ? "Créer un compte" : "Se connecter"}</DialogTitle>
          </DialogHeader>
          {authMode === "signup" ? (
            <SignupBlock
              registering={registering}
              onBack={() => setAuthMode(null)}
              onSubmit={handleSignupSubmit}
            />
          ) : (
            <LoginBlock
              onBack={() => setAuthMode(null)}
              onSelect={(p) => { setCurrentProfile(p); setAuthMode(null); toast({ title: `Connecté en tant que ${p.name}` }); }}
            />
          )}
        </DialogContent>
      </Dialog>

      <MockStripeModal
        open={showStripe}
        onClose={() => setShowStripe(false)}
        onSuccess={() => { setShowStripe(false); finalize(); }}
        amount={totalToPay}
        description={`${activityName} — MyIgiStudio`}
      />
    </>
  );
}

/* ============================================================
 * CartPickerModal — adds tariff items to the cart
 * ============================================================ */
interface PickerProps {
  open: boolean;
  onClose: () => void;
  isYoga: boolean;
  unitPrice: number;
  pricingCards: YogaFormulasPricingCard[];
  existingCards: number;
  isConnected: boolean;
  cart: CartItem[];
  onAdd: (method: CartItemMethod, capacity: number) => void;
  onRequireAuth: (formula: YogaFormulasPricingCard) => void;
}

function CartPickerModal({
  open, onClose, isYoga, unitPrice, pricingCards, existingCards, isConnected, cart, onAdd, onRequireAuth,
}: PickerProps) {
  const [voucherCode, setVoucherCode] = useState("");

  useEffect(() => {
    if (open) setVoucherCode("");
  }, [open]);

  // Count existing cards already added to cart
  const accountCardsUsed = cart.filter((c) => c.method.kind === "existing_card").length;
  const accountCardsLeft = Math.max(0, existingCards - accountCardsUsed);

  const handleUnit = () => onAdd({ kind: "unit", price: unitPrice }, 1);
  const handleVoucher = () => {
    if (!voucherCode.trim()) return;
    onAdd({ kind: "voucher", code: voucherCode.trim() }, 1);
  };
  const handleExistingCard = () => {
    if (accountCardsLeft <= 0) return;
    onAdd({ kind: "existing_card", cardName: "Carte du compte" }, 1);
  };
  const handleFormula = (card: YogaFormulasPricingCard) => {
    if (card.sessions === 1) { handleUnit(); return; }
    if (!isConnected) { onRequireAuth(card); return; }
    onAdd(
      { kind: "formula", cardId: card.id, cardName: card.name, sessions: card.sessions, price: card.price },
      card.sessions
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <Sparkles className="h-5 w-5" />
            Choisir un tarif à ajouter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Bon cadeau */}
          <div className="rounded-lg border bg-amber-50/60 border-amber-200 p-3 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Gift className="h-4 w-4 text-amber-700" /> Utiliser un bon cadeau
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Code du bon cadeau"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="bg-background"
              />
              <Button onClick={handleVoucher} disabled={!voucherCode.trim()}>Ajouter</Button>
            </div>
          </div>

          {/* Carte du compte */}
          {isYoga && isConnected && accountCardsLeft > 0 && (
            <button
              onClick={handleExistingCard}
              className="w-full text-left rounded-lg border p-4 bg-primary/5 border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-primary-dark flex items-center gap-1.5">
                    <Ticket className="h-4 w-4" /> Utiliser une de mes cartes
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {accountCardsLeft} carte{accountCardsLeft > 1 ? "s" : ""} disponible{accountCardsLeft > 1 ? "s" : ""}
                  </p>
                </div>
                <Badge>Gratuit</Badge>
              </div>
            </button>
          )}

          {/* Carte à l'unité */}
          {isYoga && (
            <button
              onClick={handleUnit}
              className="w-full text-left rounded-lg border p-4 bg-emerald-50/60 border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">Carte Yoga à l'unité</p>
                  <p className="text-xs text-muted-foreground">1 place</p>
                </div>
                <p className="text-lg font-bold">{unitPrice} €</p>
              </div>
            </button>
          )}

          {/* Formules */}
          {isYoga && pricingCards.filter((c) => c.sessions > 1).length > 0 && (
            <div className="space-y-2">
              <YogaFormulasBlock
                pricingCards={pricingCards.filter((c) => c.sessions > 1)}
                onSelectCard={handleFormula}
                showHeader={false}
              />
              {!isConnected && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Vous devez créer un compte ou vous connecter pour utiliser une formule.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Poterie : paiement direct */}
          {!isYoga && (
            <button
              onClick={() => onAdd({ kind: "unit", price: unitPrice }, 1)}
              className="w-full text-left rounded-lg border p-4 bg-amber-50/60 border-amber-200 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Paiement direct</p>
                  <p className="text-xs text-muted-foreground">1 place</p>
                </div>
                <p className="text-lg font-bold">{unitPrice} €</p>
              </div>
            </button>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour au panier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
