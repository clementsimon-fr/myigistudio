import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronLeft, ChevronRight, Plus, Users, Repeat, CalendarIcon, CalendarRange, X, Check, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedActivities } from "@/hooks/useUnifiedActivities";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { CATEGORIES, calcDuration, type UnifiedActivity } from "@/components/admin/activites/types";
import DailyView from "@/components/admin/DailyView";

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

type EventType = "ponctuel" | "recurrent" | "multi-sessions";
type WizardStep = 0 | 1 | 2 | 3 | 4;

function getCategoryDot(category: string) {
  return CATEGORIES.find(c => c.value === category)?.dot || "bg-muted-foreground";
}

function repMeta(activity: UnifiedActivity) {
  const firstSched = activity.schedules?.[0];
  const firstWs = activity.workshopEvents?.[0];
  return {
    price: firstSched?.price ?? firstWs?.price ?? activity.price ?? 0,
    inclusions: firstSched?.inclusions || firstWs?.inclusions || activity.inclusions || "",
    card_yoga_count: firstSched?.card_yoga_count ?? firstWs?.card_yoga_count ?? activity.card_yoga_count ?? 0,
  };
}

// ══════════════════════════════════════════════════════════
// ── Grille mensuelle réutilisable ──
// ══════════════════════════════════════════════════════════
function MonthGrid({
  month, onMonthChange, getDots, selectedDates, onDayClick, todayStr,
}: {
  month: Date;
  onMonthChange: (d: Date) => void;
  getDots: (date: Date) => string[];
  selectedDates: string[];
  onDayClick: (date: Date) => void;
  todayStr: string;
}) {
  const monthDays = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstOfMonth = new Date(year, m, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d));
    return cells;
  }, [month]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm md:text-base font-semibold capitalize">
          {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </h3>
        <Button variant="outline" size="icon" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const ds = formatDateStr(date);
          const isToday = ds === todayStr;
          const isSelected = selectedDates.includes(ds);
          const dots = getDots(date);
          return (
            <button
              key={ds}
              type="button"
              onClick={() => onDayClick(date)}
              className={`aspect-square rounded-lg border p-1 sm:p-1.5 flex flex-col items-center justify-start gap-0.5 hover:bg-muted/50 transition-colors ${
                isSelected ? "bg-primary/10 border-primary" : isToday ? "border-neutral-700 border-2" : "border-border"
              }`}
            >
              <span className={`text-xs sm:text-sm ${isToday ? "font-bold underline" : ""}`}>{date.getDate()}</span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dots.map((cat, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${getCategoryDot(cat)}`} />)}
                </div>
              )}
              {isSelected && <Check className="h-3 w-3 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function MonthlyView({ categoryFilter = "all" }: { categoryFilter?: string }) {
  const { toast } = useToast();
  const { activities, loading, refetch } = useUnifiedActivities();
  const todayStr = formatDateStr(new Date());
  const [browseMonth, setBrowseMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);

  // ── Wizard "Ajouter une date" ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(0);
  const [wActivityId, setWActivityId] = useState("");
  const [wType, setWType] = useState<EventType>("ponctuel");
  const [wDates, setWDates] = useState<string[]>([]);
  const [wCalMonth, setWCalMonth] = useState(new Date());
  const [wTime, setWTime] = useState("09:00");
  const [wEndTime, setWEndTime] = useState("10:00");
  // Horaires individuels par date pour les événements multi-sessions (chaque date peut avoir son propre créneau).
  const [wDateTimes, setWDateTimes] = useState<Record<string, { time: string; end_time: string }>>({});
  const [wSpots, setWSpots] = useState(12);
  const [wPrice, setWPrice] = useState(0);
  const [wCardCount, setWCardCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const filteredActivities = useMemo(
    () => categoryFilter === "all" ? activities : activities.filter(a => a.category === categoryFilter),
    [activities, categoryFilter],
  );

  const activityByKey = useMemo(() => {
    const map: Record<string, UnifiedActivity> = {};
    activities.forEach(a => { map[a.source + ":" + a.id] = a; });
    return map;
  }, [activities]);

  const getEventsForDate = (date: Date) => {
    const ds = formatDateStr(date);
    const dn = DAY_NAMES[date.getDay()];
    const cats: string[] = [];
    for (const activity of filteredActivities) {
      // Une pastille par créneau réel (pas par activité) pour refléter le nombre d'événements du jour.
      for (const s of activity.schedules || []) {
        if (s.day === dn) cats.push(activity.category);
      }
      for (const we of activity.workshopEvents || []) {
        if (we.date === ds) cats.push(activity.category);
      }
    }
    return cats;
  };

  const resetWizard = () => {
    setStep(0);
    setWActivityId("");
    setWType("ponctuel");
    setWDates([]);
    setWCalMonth(new Date());
    setWTime("09:00");
    setWEndTime("10:00");
    setWDateTimes({});
    setWSpots(12);
    setWPrice(0);
    setWCardCount(1);
  };

  const openWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const wActivity = activityByKey[wActivityId];
  const isWYoga = wActivity?.category === "yoga";

  // Pré-remplit prix/cartes/places dès que l'activité est choisie
  useEffect(() => {
    const activity = activityByKey[wActivityId];
    if (!activity) return;
    const meta = repMeta(activity);
    setWPrice(meta.price);
    setWCardCount(meta.card_yoga_count || 1);
    setWSpots(activity.spots || 12);
    // "Récurrent" n'est proposé que pour le yoga — si l'activité change pour une non-yoga
    // alors que "Récurrent" était sélectionné, on retombe sur "Ponctuel".
    if (activity.category !== "yoga" && wType === "recurrent") {
      setWType("ponctuel");
      setWDates([]);
    }
  }, [wActivityId]);

  const toggleWizardDate = (date: Date) => {
    const ds = formatDateStr(date);
    if (wType === "multi-sessions") {
      setWDates(prev => prev.includes(ds) ? prev.filter(d => d !== ds) : [...prev, ds].sort());
      setWDateTimes(prev => {
        if (prev[ds]) {
          const next = { ...prev };
          delete next[ds];
          return next;
        }
        return { ...prev, [ds]: { time: wTime, end_time: wEndTime } };
      });
    } else {
      setWDates([ds]);
    }
  };

  const handleSubmitWizard = async () => {
    const activity = activityByKey[wActivityId];
    if (!activity || wDates.length === 0) return;
    setSaving(true);
    const duration = calcDuration(wTime, wEndTime);
    const meta = repMeta(activity);
    const isYogaSubmit = activity.category === "yoga";
    const submitPrice = isYogaSubmit ? 0 : wPrice;
    // 1 date de yoga = 1 cours, non modifiable par date (le tarif se paramètre sur la fiche).
    const submitCardCount = isYogaSubmit ? 1 : meta.card_yoga_count;

    try {
      if (wType === "recurrent") {
        const dn = DAY_NAMES[new Date(wDates[0] + "T12:00:00").getDay()];
        let courseId = activity.courseIds?.[0];
        if (!courseId) {
          const { data, error } = await supabase.from("courses").insert({
            name: activity.name, category: activity.category, description: activity.description,
            long_description: activity.long_description, instructor: activity.instructor, instructor_id: activity.instructor_id,
            image: activity.image, images: activity.images, modalities: activity.modalities,
            reminder_template: activity.reminder_template, reminder_timing: activity.reminder_timing,
            intensity: activity.intensity === "none" ? "" : activity.intensity,
            day: dn, time: wTime, end_time: wEndTime, duration, days: [dn], frequency: "hebdomadaire",
            spots: wSpots, spots_left: wSpots, price: submitPrice, card_yoga_count: submitCardCount, inclusions: meta.inclusions,
            complementary_info: activity.complementary_info,
          } as any).select("id").single();
          if (error) throw error;
          courseId = data?.id;
        }
        const { error: schedErr } = await supabase.from("course_schedules").insert({
          course_id: courseId, day: dn, time: wTime, end_time: wEndTime,
          spots: wSpots, spots_left: wSpots, price: submitPrice, inclusions: meta.inclusions, card_yoga_count: submitCardCount,
        } as any);
        if (schedErr) throw schedErr;
      } else {
        const linkedGroup = wType === "multi-sessions" && wDates.length > 1 ? crypto.randomUUID() : null;
        for (const d of wDates) {
          const dTime = isMultiDateWizard ? (wDateTimes[d]?.time || wTime) : wTime;
          const dEndTime = isMultiDateWizard ? (wDateTimes[d]?.end_time || wEndTime) : wEndTime;
          const dDuration = isMultiDateWizard ? calcDuration(dTime, dEndTime) : duration;
          const { error } = await supabase.from("workshops").insert({
            name: activity.name, category: activity.category, description: activity.description,
            long_description: activity.long_description, instructor_id: activity.instructor_id,
            image: activity.image, images: activity.images, modalities: activity.modalities,
            reminder_template: activity.reminder_template, reminder_timing: activity.reminder_timing,
            intensity: activity.intensity === "none" ? "" : activity.intensity,
            date: d, time: dTime, end_time: dEndTime, duration: dDuration,
            spots: wSpots, spots_left: wSpots, price: submitPrice, card_yoga_count: submitCardCount, inclusions: meta.inclusions,
            complementary_info: activity.complementary_info,
            frequency: linkedGroup ? "multi-sessions" : "ponctuel", linked_group: linkedGroup,
          } as any);
          if (error) throw error;
        }
      }
      toast({ title: "Événement ajouté ✓" });
      setWizardOpen(false);
      setSelectedDate(wDates[0]);
      await refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Bouton retour du téléphone / geste swipe-back : revient à l'étape précédente
  // au lieu de quitter la page. À la toute première étape, ferme l'assistant.
  // (doit rester avant tout `return` conditionnel pour respecter les Rules of Hooks)
  useBackNavigation(wizardOpen, step, () => {
    if (step === 0) setWizardOpen(false);
    else setStep((s) => (s - 1) as WizardStep);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  const stepLabels = ["Activité", "Type", "Date", "Heure", "Modalités"];
  const isMultiDateWizard = wType === "multi-sessions" && wDates.length > 1;
  const canGoNext =
    (step === 0 && !!wActivityId) ||
    (step === 1 && !!wType) ||
    (step === 2 && wDates.length > 0) ||
    (step === 3 && (isMultiDateWizard
      ? wDates.every(d => !!wDateTimes[d]?.time && !!wDateTimes[d]?.end_time)
      : !!wTime && !!wEndTime)) ||
    step === 4;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={openWizard}>
          <Plus className="h-4 w-4" /> Ajouter une date
        </Button>
      </div>

      <MonthGrid
        month={browseMonth}
        onMonthChange={setBrowseMonth}
        getDots={getEventsForDate}
        selectedDates={selectedDate ? [selectedDate] : []}
        onDayClick={(d) => setSelectedDate(formatDateStr(d))}
        todayStr={todayStr}
      />

      {selectedDate && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm md:text-base font-semibold capitalize text-center">{selectedDateLabel}</h3>
          <DailyView date={new Date(selectedDate + "T12:00:00")} categoryFilter={categoryFilter} />
        </div>
      )}

      {/* ═══ Assistant "Ajouter une date" ═══ */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setWizardOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="relative w-full sm:max-w-lg bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 pb-24 sm:p-6 md:pb-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold">Ajouter une date</h3>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWizardOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 mb-4 text-[11px] text-muted-foreground">
              {stepLabels.map((label, i) => (
                <span key={label} className={`flex items-center gap-1 ${i === step ? "text-primary font-semibold" : ""}`}>
                  {i > 0 && <span className="opacity-50">→</span>}
                  {label}
                </span>
              ))}
            </div>

            <div className="space-y-4 pb-4">
              {step === 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Quelle activité ?</Label>
                  <div className="grid gap-1.5 max-h-[50vh] overflow-y-auto">
                    {/* Le choix de l'activité ici n'est pas lié au filtre Yoga/Poterie de la page :
                        Élodie doit pouvoir ajouter une date pour n'importe quelle activité. */}
                    {activities.map(a => (
                      <button
                        key={a.source + ":" + a.id}
                        type="button"
                        onClick={() => setWActivityId(a.source + ":" + a.id)}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-sm text-left transition-colors ${
                          wActivityId === a.source + ":" + a.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDot(a.category)}`} />
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2">
                  <Label className="text-sm">Quel type d'événement ?</Label>
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant={wType === "ponctuel" ? "default" : "outline"} className="justify-start gap-2" onClick={() => { setWType("ponctuel"); setWDates([]); }}>
                      <CalendarIcon className="h-4 w-4" /> Ponctuel — une seule date
                    </Button>
                    {/* La récurrence hebdomadaire n'existe qu'au format "cours" (table courses/
                        course_schedules) — un événement poterie récurrent y serait invisible côté
                        client, puisque la page d'accueil lit les ateliers depuis la table workshops. */}
                    {isWYoga && (
                      <Button type="button" variant={wType === "recurrent" ? "default" : "outline"} className="justify-start gap-2" onClick={() => { setWType("recurrent"); setWDates([]); }}>
                        <Repeat className="h-4 w-4" /> Récurrent — chaque semaine
                      </Button>
                    )}
                    <Button type="button" variant={wType === "multi-sessions" ? "default" : "outline"} className="justify-start gap-2" onClick={() => { setWType("multi-sessions"); setWDates([]); }}>
                      <CalendarRange className="h-4 w-4" /> Multi-sessions — plusieurs dates liées
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    {wType === "multi-sessions" ? "Choisissez toutes les dates de la série" : wType === "recurrent" ? "Choisissez un jour type (détermine la récurrence)" : "Choisissez la date"}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Les pastilles indiquent les événements déjà programmés — vérifiez avant de valider pour éviter les doublons.</p>
                  <MonthGrid
                    month={wCalMonth}
                    onMonthChange={setWCalMonth}
                    getDots={getEventsForDate}
                    selectedDates={wDates}
                    onDayClick={toggleWizardDate}
                    todayStr={todayStr}
                  />
                  {wDates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {wDates.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary-dark rounded-full px-2.5 py-1">
                          {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                          {wType === "multi-sessions" && (
                            <button type="button" onClick={() => {
                              setWDates(prev => prev.filter(x => x !== d));
                              setWDateTimes(prev => { const next = { ...prev }; delete next[d]; return next; });
                            }}><X className="h-3 w-3" /></button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  {isMultiDateWizard ? (
                    <>
                      <Label className="text-sm">Horaire de chaque date</Label>
                      <p className="text-[11px] text-muted-foreground">Chaque date de la série peut avoir son propre horaire.</p>
                      <div className="space-y-2">
                        {wDates.map(d => {
                          const dt = wDateTimes[d] || { time: wTime, end_time: wEndTime };
                          return (
                            <div key={d} className="flex items-center gap-2 rounded-lg border p-2">
                              <span className="text-xs font-medium capitalize w-24 shrink-0">
                                {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </span>
                              <Input type="time" className="w-[110px] h-9" value={dt.time} onChange={e => setWDateTimes(prev => ({ ...prev, [d]: { ...dt, time: e.target.value } }))} />
                              <span className="text-muted-foreground text-xs">→</span>
                              <Input type="time" className="w-[110px] h-9" value={dt.end_time} onChange={e => setWDateTimes(prev => ({ ...prev, [d]: { ...dt, end_time: e.target.value } }))} />
                              {dt.time && dt.end_time && <span className="text-[11px] text-muted-foreground ml-auto">{calcDuration(dt.time, dt.end_time)}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <>
                      <Label className="text-sm">Horaire</Label>
                      <div className="flex items-center gap-2">
                        <Input type="time" className="w-[120px] h-10" value={wTime} onChange={e => setWTime(e.target.value)} />
                        <span className="text-muted-foreground">→</span>
                        <Input type="time" className="w-[120px] h-10" value={wEndTime} onChange={e => setWEndTime(e.target.value)} />
                        {wTime && wEndTime && <span className="text-xs text-muted-foreground">{calcDuration(wTime, wEndTime)}</span>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <Label className="text-sm">Modalités</Label>
                  {isWYoga ? (
                    // Le tarif (cours ou prix) se configure sur la fiche activité, pas par date —
                    // une date de yoga vaut toujours 1 cours quand la fiche est en mode "Cours".
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Tarif défini sur la fiche activité (1 cours par défaut).
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground w-28">Prix</Label>
                      <Input type="number" className="w-[100px] h-9" value={wPrice} onChange={e => setWPrice(Number(e.target.value))} />
                      <span className="text-sm text-muted-foreground">€</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground w-28">Participants</Label>
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="w-[100px] h-9" value={wSpots} onChange={e => setWSpots(Number(e.target.value))} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(s => (s - 1) as WizardStep)}>
                Retour
              </Button>
              {step < 4 ? (
                <Button type="button" disabled={!canGoNext} onClick={() => setStep(s => (s + 1) as WizardStep)}>
                  Suivant
                </Button>
              ) : (
                <Button type="button" disabled={saving} onClick={handleSubmitWizard} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Valider
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
