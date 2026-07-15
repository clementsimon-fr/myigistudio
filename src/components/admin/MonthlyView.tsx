import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ChevronLeft, ChevronRight, X, Plus, Trash2, Users, Repeat, CalendarIcon, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedActivities } from "@/hooks/useUnifiedActivities";
import { CATEGORIES, calcDuration, type UnifiedActivity } from "@/components/admin/activites/types";

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

type EventType = "ponctuel" | "recurrent" | "multi-sessions";

interface DayEvent {
  activity: UnifiedActivity;
  kind: "recurrent" | "ponctuel" | "multi";
  refId: string; // schedule id or workshop event id
  time: string;
  end_time: string;
  spots: number;
}

function getCategoryDot(category: string) {
  return CATEGORIES.find(c => c.value === category)?.dot || "bg-muted-foreground";
}

// Representative price/inclusions/card count for an activity (mirrors the fallback logic used in Activites.tsx openEdit())
function repMeta(activity: UnifiedActivity) {
  const firstSched = activity.schedules?.[0];
  const firstWs = activity.workshopEvents?.[0];
  return {
    price: firstSched?.price ?? firstWs?.price ?? activity.price ?? 0,
    inclusions: firstSched?.inclusions || firstWs?.inclusions || activity.inclusions || "",
    card_yoga_count: firstSched?.card_yoga_count ?? firstWs?.card_yoga_count ?? activity.card_yoga_count ?? 0,
  };
}

export default function MonthlyView({ categoryFilter = "all" }: { categoryFilter?: string }) {
  const { toast } = useToast();
  const { activities, loading, refetch } = useUnifiedActivities();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  const [newActivityId, setNewActivityId] = useState<string>("");
  const [newType, setNewType] = useState<EventType>("ponctuel");
  const [newTime, setNewTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newSpots, setNewSpots] = useState(12);
  const [newExtraDates, setNewExtraDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DayEvent | null>(null);

  const filteredActivities = useMemo(
    () => categoryFilter === "all" ? activities : activities.filter(a => a.category === categoryFilter),
    [activities, categoryFilter],
  );

  const activityByKey = useMemo(() => {
    const map: Record<string, UnifiedActivity> = {};
    filteredActivities.forEach(a => { map[a.source + ":" + a.id] = a; });
    return map;
  }, [filteredActivities]);

  const todayStr = formatDateStr(new Date());

  // ── Month grid ──
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [currentMonth]);

  const getEventsForDate = (date: Date): DayEvent[] => {
    const ds = formatDateStr(date);
    const dn = DAY_NAMES[date.getDay()];
    const events: DayEvent[] = [];
    for (const activity of filteredActivities) {
      for (const s of activity.schedules || []) {
        if (s.day === dn) events.push({ activity, kind: "recurrent", refId: s.id!, time: s.time, end_time: s.end_time, spots: s.spots });
      }
      for (const we of activity.workshopEvents || []) {
        if (we.date === ds) events.push({ activity, kind: we.linked_group ? "multi" : "ponctuel", refId: we.id, time: we.time, end_time: we.end_time, spots: we.spots });
      }
    }
    return events.sort((a, b) => a.time.localeCompare(b.time));
  };

  const sheetEvents = useMemo(() => {
    if (!sheetDate) return [];
    const [y, m, d] = sheetDate.split("-").map(Number);
    return getEventsForDate(new Date(y, m - 1, d));
  }, [sheetDate, filteredActivities]);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => setCurrentMonth(new Date());

  const resetAddForm = () => {
    setNewActivityId("");
    setNewType("ponctuel");
    setNewTime("09:00");
    setNewEndTime("10:00");
    setNewSpots(12);
    setNewExtraDates([]);
  };

  const openDay = (date: Date) => {
    setSheetDate(formatDateStr(date));
    resetAddForm();
  };

  const handleAddEvent = async () => {
    if (!sheetDate || !newActivityId) return;
    const activity = activityByKey[newActivityId];
    if (!activity) return;
    setSaving(true);
    const meta = repMeta(activity);
    const duration = calcDuration(newTime, newEndTime);

    try {
      if (newType === "recurrent") {
        const dn = DAY_NAMES[new Date(sheetDate + "T12:00:00").getDay()];
        let courseId = activity.courseIds?.[0];
        if (!courseId) {
          const { data, error } = await supabase.from("courses").insert({
            name: activity.name, category: activity.category, description: activity.description,
            long_description: activity.long_description, instructor: activity.instructor, instructor_id: activity.instructor_id,
            image: activity.image, images: activity.images, modalities: activity.modalities,
            reminder_template: activity.reminder_template, reminder_timing: activity.reminder_timing,
            intensity: activity.intensity === "none" ? "" : activity.intensity,
            day: dn, time: newTime, end_time: newEndTime, duration, days: [dn], frequency: "hebdomadaire",
            spots: newSpots, spots_left: newSpots, price: meta.price, card_yoga_count: meta.card_yoga_count, inclusions: meta.inclusions,
            complementary_info: activity.complementary_info,
          } as any).select("id").single();
          if (error) throw error;
          courseId = data?.id;
        }
        const { error: schedErr } = await supabase.from("course_schedules").insert({
          course_id: courseId, day: dn, time: newTime, end_time: newEndTime,
          spots: newSpots, spots_left: newSpots, price: meta.price, inclusions: meta.inclusions, card_yoga_count: meta.card_yoga_count,
        } as any);
        if (schedErr) throw schedErr;
      } else {
        const dates = newType === "multi-sessions" ? [sheetDate, ...newExtraDates.filter(Boolean)] : [sheetDate];
        const linkedGroup = newType === "multi-sessions" && dates.length > 1 ? crypto.randomUUID() : null;
        for (const d of dates) {
          const { error } = await supabase.from("workshops").insert({
            name: activity.name, category: activity.category, description: activity.description,
            long_description: activity.long_description, instructor_id: activity.instructor_id,
            image: activity.image, images: activity.images, modalities: activity.modalities,
            reminder_template: activity.reminder_template, reminder_timing: activity.reminder_timing,
            intensity: activity.intensity === "none" ? "" : activity.intensity,
            date: d, time: newTime, end_time: newEndTime, duration,
            spots: newSpots, spots_left: newSpots, price: meta.price, card_yoga_count: meta.card_yoga_count, inclusions: meta.inclusions,
            complementary_info: activity.complementary_info,
            frequency: linkedGroup ? "multi-sessions" : "ponctuel", linked_group: linkedGroup,
          } as any);
          if (error) throw error;
        }
      }
      toast({ title: "Événement ajouté ✓" });
      resetAddForm();
      await refetch();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateEvent = async (ev: DayEvent, patch: { time?: string; end_time?: string; spots?: number }) => {
    const table = ev.kind === "recurrent" ? "course_schedules" : "workshops";
    const payload: any = { ...patch };
    if (patch.spots !== undefined) payload.spots_left = patch.spots;
    const { error } = await supabase.from(table).update(payload).eq("id", ev.refId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    await refetch();
  };

  const confirmDeleteEvent = async () => {
    if (!pendingDelete) return;
    const table = pendingDelete.kind === "recurrent" ? "course_schedules" : "workshops";
    const { error } = await supabase.from(table).delete().eq("id", pendingDelete.refId);
    setPendingDelete(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Supprimé" });
    await refetch();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const sheetDateLabel = sheetDate
    ? new Date(sheetDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <h3 className="text-sm md:text-lg font-semibold capitalize">
            {currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </h3>
          <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={goToday}>Aujourd'hui</Button>
        </div>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
        {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthDays.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const ds = formatDateStr(date);
          const isToday = ds === todayStr;
          const events = getEventsForDate(date);
          const dots = [...new Set(events.map(e => e.activity.category))];
          return (
            <button
              key={ds}
              onClick={() => openDay(date)}
              className={`aspect-square rounded-lg border p-1 sm:p-1.5 flex flex-col items-center justify-start gap-0.5 hover:bg-muted/50 transition-colors ${isToday ? "border-neutral-700 border-2" : "border-border"}`}
            >
              <span className={`text-xs sm:text-sm ${isToday ? "font-bold underline" : ""}`}>{date.getDate()}</span>
              {dots.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dots.slice(0, 3).map(cat => <span key={cat} className={`w-1.5 h-1.5 rounded-full ${getCategoryDot(cat)}`} />)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ Panneau bas d'écran : détail d'une date ═══ */}
      {sheetDate && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setSheetDate(null)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <div
            className="relative w-full sm:max-w-2xl bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold capitalize">{sheetDateLabel}</h3>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSheetDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 pb-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Événements ce jour</Label>
              {sheetEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement ce jour-là.</p>
              ) : (
                sheetEvents.map(ev => (
                  <div key={ev.kind + ev.refId} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${getCategoryDot(ev.activity.category)}`} />
                        <span className="text-sm font-medium truncate">{ev.activity.name}</span>
                        {ev.kind === "recurrent" && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
                        {ev.kind === "multi" && <CalendarRange className="h-3 w-3 text-muted-foreground shrink-0" />}
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => setPendingDelete(ev)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {ev.kind === "recurrent" && (
                      <p className="text-[11px] text-muted-foreground">Récurrent chaque {DAY_NAMES[new Date(sheetDate + "T12:00:00").getDay()]} — modifier l'horaire changera toutes les occurrences.</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Input type="time" className="w-[100px] h-8 text-xs" value={ev.time} onChange={e => updateEvent(ev, { time: e.target.value })} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input type="time" className="w-[100px] h-8 text-xs" value={ev.end_time} onChange={e => updateEvent(ev, { end_time: e.target.value })} />
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input type="number" className="w-[70px] h-8 text-xs" value={ev.spots} onChange={e => updateEvent(ev, { spots: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>
                ))
              )}

              <div className="border-t pt-4 space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ajouter un événement</Label>

                <div>
                  <Label className="text-xs mb-1 block">Activité</Label>
                  <Select value={newActivityId} onValueChange={setNewActivityId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir une activité..." /></SelectTrigger>
                    <SelectContent>
                      {filteredActivities.map(a => (
                        <SelectItem key={a.source + ":" + a.id} value={a.source + ":" + a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-1.5">
                  <Button type="button" size="sm" variant={newType === "ponctuel" ? "default" : "outline"} className="gap-1 text-xs flex-1" onClick={() => setNewType("ponctuel")}>
                    <CalendarIcon className="h-3.5 w-3.5" /> Ponctuel
                  </Button>
                  <Button type="button" size="sm" variant={newType === "recurrent" ? "default" : "outline"} className="gap-1 text-xs flex-1" onClick={() => setNewType("recurrent")}>
                    <Repeat className="h-3.5 w-3.5" /> Récurrent
                  </Button>
                  <Button type="button" size="sm" variant={newType === "multi-sessions" ? "default" : "outline"} className="gap-1 text-xs flex-1" onClick={() => setNewType("multi-sessions")}>
                    <CalendarRange className="h-3.5 w-3.5" /> Multi-sessions
                  </Button>
                </div>

                {newType === "recurrent" && (
                  <p className="text-[11px] text-muted-foreground">
                    Crée un cours chaque {DAY_NAMES[new Date(sheetDate + "T12:00:00").getDay()]} à l'horaire choisi.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Input type="time" className="w-[100px] h-9 text-sm" value={newTime} onChange={e => setNewTime(e.target.value)} />
                  <span className="text-muted-foreground text-xs">→</span>
                  <Input type="time" className="w-[100px] h-9 text-sm" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} />
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input type="number" className="w-[70px] h-9 text-sm" value={newSpots} onChange={e => setNewSpots(Number(e.target.value))} />
                  </div>
                </div>

                {newType === "multi-sessions" && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">Première date : {sheetDate ? new Date(sheetDate + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}. Ajoutez les autres dates de la série :</p>
                    {newExtraDates.map((d, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Input type="date" className="w-[150px] h-8 text-xs" value={d}
                          onChange={e => setNewExtraDates(prev => prev.map((x, xi) => xi === i ? e.target.value : x))} />
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => setNewExtraDates(prev => prev.filter((_, xi) => xi !== i))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setNewExtraDates(prev => [...prev, ""])}>
                      <Plus className="h-3 w-3" /> Ajouter une date
                    </Button>
                  </div>
                )}

                <Button type="button" className="w-full gap-1.5" disabled={!newActivityId || saving} onClick={handleAddEvent}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {pendingDelete?.kind === "recurrent" ? "ce créneau récurrent" : "cette date"} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "recurrent"
                ? `Toutes les occurrences futures de "${pendingDelete?.activity.name}" chaque semaine seront supprimées.`
                : `Cette date pour "${pendingDelete?.activity.name}" sera retirée.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
