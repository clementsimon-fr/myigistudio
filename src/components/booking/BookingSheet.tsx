import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Users, Euro, FileCheck, CreditCard, Minus, Plus, X,
  ChevronRight, ChevronLeft, Sparkles, Gift, Ticket, Info, Check, Pencil, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

type AttributionMethod =
  | { kind: "unit"; price: number }
  | { kind: "formula"; cardId: string; cardName: string; sessions: number; price: number }
  | { kind: "voucher"; code: string }
  | { kind: "existing_card"; cardName: string };

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
  const [attributions, setAttributions] = useState<Record<number, AttributionMethod | null>>({});
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [pricingCards, setPricingCards] = useState<YogaFormulasPricingCard[]>([]);
  const [guestMode, setGuestMode] = useState(false);
  const [conditionsList, setConditionsList] = useState<{ id: string; title: string; content: string }[]>([]);

  // modals
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerForParticipant, setPickerForParticipant] = useState<number | null>(null);
  const [pendingFormula, setPendingFormula] = useState<YogaFormulasPricingCard | null>(null);
  const [formulaAuthConfirm, setFormulaAuthConfirm] = useState<YogaFormulasPricingCard | null>(null);
  const [authMode, setAuthMode] = useState<null | "login" | "signup">(null);
  const [registering, setRegistering] = useState(false);
  const [showStripe, setShowStripe] = useState(false);

  // Init participants on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedIdx(0);
    setConditionsAccepted(false);
    setAttributions({});
    setGuestMode(false);
    setParticipants([{ name: currentProfile?.name || "", isMe: !!currentProfile }]);
  }, [open, currentProfile?.id, currentProfile?.name]);

  // Load pricing cards (yoga only)
  useEffect(() => {
    if (!open || !isYoga) return;
    supabase
      .from("pricing_cards")
      .select("id,name,sessions,price,validity,popular,payment_info,sort_order")
      .order("sort_order")
      .then(({ data }) => { if (data) setPricingCards(data as any); });
  }, [open, isYoga]);

  // Load conditions
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
        setAttributions((a) => { const c = { ...a }; delete c[removedIdx]; return c; });
      }
      return next;
    });
  };

  const updateParticipantName = (i: number, name: string) => {
    setParticipants((prev) => prev.map((p, idx) => idx === i ? { ...p, name } : p));
  };

  // Attribution per participant
  const setAttribution = (i: number, method: AttributionMethod | null) => {
    setAttributions((prev) => ({ ...prev, [i]: method }));
  };

  const unattributedIndexes = useMemo(
    () => participants.map((_, i) => i).filter((i) => !attributions[i]),
    [participants, attributions]
  );

  const allAttributed = unattributedIndexes.length === 0 && participants.length > 0;

  // ----- Submit reservation -----
  const totalToPay = useMemo(() => {
    let t = 0;
    Object.values(attributions).forEach((a) => {
      if (!a) return;
      if (a.kind === "unit") t += a.price;
      else if (a.kind === "formula") t += a.price; // formula price (whole pack) — paid once
    });
    return t;
  }, [attributions]);

  const finalize = async () => {
    if (!selected) return;
    const name = course?.name || workshop?.name || "";
    // For each formula attribution, give credits
    Object.values(attributions).forEach((a) => {
      if (a?.kind === "formula") addCredits(a.sessions, `Carte ${a.cardName}`);
    });
    // For each "existing_card" attribution, consume one credit
    Object.values(attributions).forEach((a) => {
      if (a?.kind === "existing_card") useCredit();
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

  // ----- Step gating -----
  const canNext = () => {
    if (step === 1) return !!selected;
    if (step === 2) return participants.length > 0 && participants.every((p) => p.name.trim().length > 0);
    if (step === 3) return allAttributed;
    if (step === 4) return conditionsAccepted;
    return true;
  };

  const STEPS = [
    { n: 1, label: "Date", icon: CalendarDays },
    { n: 2, label: "Participants", icon: Users },
    { n: 3, label: "Tarif", icon: Euro },
    { n: 4, label: "Conditions", icon: FileCheck },
    { n: 5, label: "Paiement", icon: CreditCard },
  ];

  // ----- Auth handlers (from picker) -----
  const handleSignupSubmit = (name: string) => {
    setRegistering(true);
    setTimeout(() => {
      createTempProfile(name);
      setRegistering(false);
      setAuthMode(null);
      toast({ title: "Compte créé ✓", description: "Vous pouvez maintenant choisir une formule." });
      // Re-open the picker so the user finishes on the tarif step
      if (pendingFormula) {
        setPickerOpen(true);
      }
    }, 1200);
  };

  // ----- Render -----
  const activityName = course?.name || workshop?.name || "";

  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-scroll between steps for fluidity
  useEffect(() => {
    if (open && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [step, open]);

  if (!open) return null;

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

                  {/* STEP 2 — Participants */}
                  {step === 2 && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Combien êtes-vous ?</h3>
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
                            {i === 0 && p.isMe ? (
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-sm font-medium">Moi — {p.name}</span>
                                <Badge variant="secondary" className="text-[10px]">Connecté</Badge>
                              </div>
                            ) : i === 0 && !p.isMe ? (
                              <div className="mt-1 space-y-2">
                                <Input
                                  placeholder="Votre prénom"
                                  value={p.name}
                                  onChange={(e) => updateParticipantName(i, e.target.value)}
                                />
                                {!guestMode ? (
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
                                ) : (
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <Badge variant="secondary" className="text-[10px]">Mode invité</Badge>
                                    <button onClick={() => setGuestMode(false)} className="underline hover:text-foreground">
                                      Changer
                                    </button>
                                  </div>
                                )}
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
                      </div>
                    </div>
                  )}

                  {/* STEP 3 — Tarif */}
                  {step === 3 && (
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-semibold">
                        {isYoga ? "Choisissez votre tarif" : "Mode de paiement"}
                      </h3>

                      <Button
                        onClick={() => { setPickerForParticipant(null); setPickerOpen(true); }}
                        className="w-full gap-2"
                        variant={unattributedIndexes.length === 0 ? "outline" : "default"}
                      >
                        <Sparkles className="h-4 w-4" />
                        {unattributedIndexes.length === 0 ? "Modifier les tarifs" : `Choisir (${unattributedIndexes.length} restant${unattributedIndexes.length > 1 ? "s" : ""})`}
                      </Button>

                      <div className="space-y-2">
                        {participants.map((p, i) => {
                          const a = attributions[i];
                          return (
                            <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {p.isMe ? `Moi — ${p.name}` : p.name || `Participant ${i + 1}`}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {a
                                    ? a.kind === "unit" ? `Carte à l'unité — ${a.price} €`
                                      : a.kind === "formula" ? `Formule ${a.cardName} (${a.sessions} cartes) — ${a.price} €`
                                        : a.kind === "voucher" ? `Bon cadeau ${a.code}`
                                          : `Carte du compte`
                                    : <span className="text-amber-600">Aucun moyen sélectionné</span>}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => { setPickerForParticipant(i); setPickerOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>

                      {totalToPay > 0 && (
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                          Total à régler : <strong>{totalToPay} €</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 4 — Conditions */}
                  {step === 4 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-semibold">Conditions</h3>
                      <div className="rounded-lg border bg-muted/30 max-h-72 overflow-y-auto divide-y">
                        {conditionsList.length === 0 ? (
                          <p className="p-3 text-xs text-muted-foreground">
                            En réservant, vous acceptez les conditions de réservation et d'annulation de MyIgiStudio.
                          </p>
                        ) : (
                          conditionsList.map((c) => (
                            <details key={c.id} className="group" open>
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

                  {/* STEP 5 — Récap */}
                  {step === 5 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-semibold">Récapitulatif</h3>
                      <div className="rounded-xl border bg-card p-4 space-y-3">
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
                        <div className="space-y-1.5 text-sm">
                          {participants.map((p, i) => {
                            const a = attributions[i];
                            return (
                              <div key={i} className="flex justify-between gap-3 border-t pt-1.5 first:border-t-0 first:pt-0">
                                <span className="truncate">{p.isMe ? `Moi — ${p.name}` : p.name}</span>
                                <span className="text-muted-foreground text-xs text-right">
                                  {a?.kind === "unit" && `Unité · ${a.price} €`}
                                  {a?.kind === "formula" && `${a.cardName} · ${a.price} €`}
                                  {a?.kind === "voucher" && `Bon ${a.code}`}
                                  {a?.kind === "existing_card" && `Carte du compte`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t pt-2 flex items-center justify-between">
                          <span className="text-sm font-semibold">Total à régler</span>
                          <span className="text-lg font-bold">{totalToPay} €</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

        {/* Footer CTAs */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          ) : <span />}
          {step < 5 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
              Continuer <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleConfirmPayment} className="gap-2">
              <CreditCard className="h-4 w-4" />
              {totalToPay > 0 ? `Confirmer le paiement (${totalToPay} €)` : "Confirmer la réservation"}
            </Button>
          )}
        </div>
      </div>

      {/* Picker modal */}
      <FormulasPickerModal
        open={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerForParticipant(null); setPendingFormula(null); }}
        isYoga={isYoga}
        unitPrice={pricePerUnit}
        pricingCards={pricingCards}
        participants={participants}
        attributions={attributions}
        targetParticipant={pickerForParticipant}
        existingCards={currentProfile?.credits || 0}
        isConnected={!!currentProfile}
        onPick={(method, targets) => {
          targets.forEach((idx) => setAttribution(idx, method));
          setPickerOpen(false);
          setPickerForParticipant(null);
        }}
        onRequireAuth={(formula) => {
          setPendingFormula(formula);
          setAuthMode("signup");
        }}
      />

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
 * FormulasPickerModal (inline)
 * ============================================================ */
interface PickerProps {
  open: boolean;
  onClose: () => void;
  isYoga: boolean;
  unitPrice: number;
  pricingCards: YogaFormulasPricingCard[];
  participants: Participant[];
  attributions: Record<number, AttributionMethod | null>;
  targetParticipant: number | null;
  existingCards: number;
  isConnected: boolean;
  onPick: (method: AttributionMethod, targets: number[]) => void;
  onRequireAuth: (formula: YogaFormulasPricingCard) => void;
}

function FormulasPickerModal({
  open, onClose, isYoga, unitPrice, pricingCards, participants, attributions,
  targetParticipant, existingCards, isConnected, onPick, onRequireAuth,
}: PickerProps) {
  const [voucherCode, setVoucherCode] = useState("");
  const [step, setStep] = useState<"choose" | "assign">("choose");
  const [pendingMethod, setPendingMethod] = useState<AttributionMethod | null>(null);
  const [pendingTargets, setPendingTargets] = useState<number[]>([]);
  const [maxTargets, setMaxTargets] = useState(1);

  useEffect(() => {
    if (open) {
      setStep("choose");
      setVoucherCode("");
      setPendingMethod(null);
      setPendingTargets(targetParticipant !== null ? [targetParticipant] : []);
      setMaxTargets(1);
    }
  }, [open, targetParticipant]);

  const remainingIdxs = useMemo(() => {
    const base = participants.map((_, i) => i);
    if (targetParticipant !== null) return [targetParticipant];
    return base.filter((i) => !attributions[i]);
  }, [participants, attributions, targetParticipant]);

  const goAssign = (method: AttributionMethod, max: number) => {
    setPendingMethod(method);
    setMaxTargets(max);
    if (targetParticipant !== null) {
      onPick(method, [targetParticipant]);
      onClose();
      return;
    }
    if (remainingIdxs.length === 1) {
      onPick(method, remainingIdxs);
      onClose();
      return;
    }
    setPendingTargets([]);
    setStep("assign");
  };

  const handleUnit = () => {
    goAssign({ kind: "unit", price: unitPrice }, remainingIdxs.length);
  };

  const handleVoucher = () => {
    if (!voucherCode.trim()) return;
    goAssign({ kind: "voucher", code: voucherCode.trim() }, 1);
  };

  const handleExistingCard = () => {
    if (existingCards <= 0) return;
    goAssign({ kind: "existing_card", cardName: "Carte du compte" }, Math.min(existingCards, remainingIdxs.length));
  };

  const handleFormula = (card: YogaFormulasPricingCard) => {
    if (card.sessions === 1) {
      handleUnit();
      return;
    }
    if (!isConnected) {
      onRequireAuth(card);
      return;
    }
    goAssign(
      { kind: "formula", cardId: card.id, cardName: card.name, sessions: card.sessions, price: card.price },
      Math.min(card.sessions, remainingIdxs.length)
    );
  };

  const remainingForUnit = remainingIdxs.length;
  const unitTotalDisplay = remainingForUnit * unitPrice;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <Sparkles className="h-5 w-5" />
            {step === "choose" ? "Choisir votre mode de paiement" : "À qui attribuer ?"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-4 pt-2">
            {/* 1. Bon cadeau */}
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
                <Button onClick={handleVoucher} disabled={!voucherCode.trim()}>Appliquer</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Vous pouvez saisir un bon cadeau pour chaque participant en répétant l'opération.
              </p>
            </div>

            {isYoga && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide">ou choisir un cours à l'unité</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* 2. Carte du compte (si connecté + cartes dispo) */}
            {isYoga && isConnected && existingCards > 0 && (
              <button
                onClick={handleExistingCard}
                className="w-full text-left rounded-lg border p-4 bg-primary/5 border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-primary-dark flex items-center gap-1.5">
                      <Ticket className="h-4 w-4" /> Utiliser mes cartes
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Vous avez {existingCards} carte{existingCards > 1 ? "s" : ""} disponible{existingCards > 1 ? "s" : ""}</p>
                  </div>
                  <Badge>Gratuit</Badge>
                </div>
              </button>
            )}

            {/* 3. Carte à l'unité (prix × restants) */}
            {isYoga && (
              <button
                onClick={handleUnit}
                className="w-full text-left rounded-lg border p-4 bg-emerald-50/60 border-emerald-200 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">Carte Yoga à l'unité</p>
                    <p className="text-xs text-muted-foreground">
                      {remainingForUnit} participant{remainingForUnit > 1 ? "s" : ""} restant{remainingForUnit > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{unitTotalDisplay} €</p>
                    <Badge variant="secondary" className="text-xs">{remainingForUnit} cours</Badge>
                  </div>
                </div>
              </button>
            )}

            {/* 4. Formules (yoga only) */}
            {isYoga && pricingCards.filter((c) => c.sessions > 1).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wide">ou choisir une formule</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
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
                onClick={() => goAssign({ kind: "unit", price: unitPrice }, remainingIdxs.length)}
                className="w-full text-left rounded-lg border p-4 bg-amber-50/60 border-amber-200 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Paiement direct</p>
                    <p className="text-xs text-muted-foreground">{remainingForUnit} place{remainingForUnit > 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-lg font-bold">{unitTotalDisplay} €</p>
                </div>
              </button>
            )}
          </div>
        )}

        {step === "assign" && pendingMethod && (
          <div className="space-y-3 pt-2">
            <button onClick={() => setStep("choose")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Retour
            </button>
            <p className="text-sm">Sélectionnez le ou les participants concernés (max {maxTargets}) :</p>
            <div className="space-y-2">
              {remainingIdxs.map((idx) => {
                const p = participants[idx];
                const checked = pendingTargets.includes(idx);
                return (
                  <label key={idx} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (c) {
                          if (pendingTargets.length >= maxTargets) return;
                          setPendingTargets([...pendingTargets, idx]);
                        } else {
                          setPendingTargets(pendingTargets.filter((i) => i !== idx));
                        }
                      }}
                    />
                    <span className="text-sm">{p.isMe ? `Moi — ${p.name}` : p.name || `Participant ${idx + 1}`}</span>
                  </label>
                );
              })}
            </div>
            <Button
              className="w-full"
              disabled={pendingTargets.length === 0}
              onClick={() => { onPick(pendingMethod, pendingTargets); onClose(); }}
            >
              <Check className="h-4 w-4 mr-1" /> Valider l'attribution
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
