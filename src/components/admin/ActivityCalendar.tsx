import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  id?: string;
  day: string;
  time: string;
  end_time: string;
  course_id: string;
}

interface CourseInfo {
  id: string;
  name: string;
  category: string;
}

interface WorkshopInfo {
  id: string;
  name: string;
  category: string;
}

interface PlannedSession {
  id: string;
  course_id: string | null;
  workshop_id: string | null;
  title: string;
  date: string;
  time: string;
  end_time: string;
  notes: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: SessionEntry[];
}

interface SessionEntry {
  id: string;
  title: string;
  time: string;
  end_time: string;
  type: "recurring" | "planned";
  source?: string;
}

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function getDayName(date: Date): string {
  const jsDay = date.getDay();
  return DAY_NAMES[jsDay === 0 ? 6 : jsDay - 1];
}

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: CalendarDay[] = [];

  // Start from Monday of the first week
  let jsDay = firstDay.getDay();
  let startOffset = jsDay === 0 ? 6 : jsDay - 1;

  for (let i = -startOffset; i <= lastDay.getDate() + (6 - (lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1)); i++) {
    const d = new Date(year, month, i + 1);
    if (days.length >= 42) break; // max 6 weeks
    days.push({
      date: d,
      isCurrentMonth: d.getMonth() === month,
      isToday: d.getTime() === today.getTime(),
      sessions: [],
    });
  }

  // Ensure we have complete weeks (multiple of 7)
  while (days.length % 7 !== 0 && days.length < 42) {
    const lastDate = days[days.length - 1].date;
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 1);
    days.push({
      date: d,
      isCurrentMonth: false,
      isToday: false,
      sessions: [],
    });
  }

  return days;
}

export default function ActivityCalendar() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopInfo[]>([]);
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);

  const [sessionForm, setSessionForm] = useState({
    source: "manual" as "course" | "workshop" | "manual",
    sourceId: "",
    title: "",
    time: "09:00",
    end_time: "10:00",
    notes: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = async () => {
    const [schedulesRes, coursesRes, workshopsRes, sessionsRes] = await Promise.all([
      supabase.from("course_schedules").select("*"),
      supabase.from("courses").select("id, name, category"),
      supabase.from("workshops").select("id, name, category"),
      supabase.from("planned_sessions").select("*"),
    ]);
    if (schedulesRes.data) setSchedules(schedulesRes.data as Schedule[]);
    if (coursesRes.data) setCourses(coursesRes.data as CourseInfo[]);
    if (workshopsRes.data) setWorkshops(workshopsRes.data as WorkshopInfo[]);
    if (sessionsRes.data) setPlannedSessions(sessionsRes.data as PlannedSession[]);
  };

  useEffect(() => { fetchData(); }, []);

  const courseMap = useMemo(() => {
    const m: Record<string, string> = {};
    courses.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [courses]);

  const calendarDays = useMemo(() => {
    const days = getMonthDays(year, month);

    // Project recurring schedules
    for (const day of days) {
      const dayName = getDayName(day.date);
      const matchingSchedules = schedules.filter(s => s.day === dayName);
      for (const s of matchingSchedules) {
        day.sessions.push({
          id: `rec-${s.id}-${day.date.toISOString()}`,
          title: courseMap[s.course_id] || "Cours",
          time: s.time,
          end_time: s.end_time,
          type: "recurring",
        });
      }

      // Add planned sessions for this date
      const dateStr = day.date.toISOString().split("T")[0];
      const dayPlanned = plannedSessions.filter(ps => ps.date === dateStr);
      for (const ps of dayPlanned) {
        day.sessions.push({
          id: ps.id,
          title: ps.title || (ps.course_id ? courseMap[ps.course_id] : "Séance"),
          time: ps.time,
          end_time: ps.end_time,
          type: "planned",
        });
      }

      // Sort sessions by time
      day.sessions.sort((a, b) => a.time.localeCompare(b.time));
    }

    return days;
  }, [year, month, schedules, plannedSessions, courseMap]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const openAddSession = (date: Date) => {
    setSelectedDate(date);
    setSessionForm({ source: "manual", sourceId: "", title: "", time: "09:00", end_time: "10:00", notes: "" });
    setDialogOpen(true);
  };

  const handleSourceChange = (source: "course" | "workshop" | "manual") => {
    setSessionForm(prev => ({ ...prev, source, sourceId: "", title: "" }));
  };

  const handleSourceIdChange = (id: string) => {
    const course = courses.find(c => c.id === id);
    const workshop = workshops.find(w => w.id === id);
    const name = course?.name || workshop?.name || "";
    setSessionForm(prev => ({ ...prev, sourceId: id, title: name }));
  };

  const saveSession = async () => {
    if (!selectedDate) return;
    const dateStr = selectedDate.toISOString().split("T")[0];
    const payload: Record<string, unknown> = {
      title: sessionForm.title,
      date: dateStr,
      time: sessionForm.time,
      end_time: sessionForm.end_time,
      notes: sessionForm.notes,
    };
    if (sessionForm.source === "course" && sessionForm.sourceId) payload.course_id = sessionForm.sourceId;
    if (sessionForm.source === "workshop" && sessionForm.sourceId) payload.workshop_id = sessionForm.sourceId;

    await supabase.from("planned_sessions").insert(payload);
    toast({ title: "Séance ajoutée" });
    setDialogOpen(false);
    fetchData();
  };

  const confirmDeleteSession = async () => {
    if (!deletingSession) return;
    await supabase.from("planned_sessions").delete().eq("id", deletingSession);
    toast({ title: "Séance supprimée", variant: "destructive" });
    setDeletingSession(null);
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <h3 className="text-lg font-semibold capitalize">{MONTH_NAMES[month]} {year}</h3>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DAY_NAMES.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d.slice(0, 3)}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => (
            <div
              key={i}
              className={`min-h-[100px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/20 ${
                !day.isCurrentMonth ? "bg-muted/5 text-muted-foreground/40" : ""
              } ${day.isToday ? "bg-accent/10" : ""}`}
              onClick={() => openAddSession(day.date)}
            >
              <div className={`text-xs font-medium mb-1 ${day.isToday ? "text-primary font-bold" : ""}`}>
                {day.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {day.sessions.slice(0, 3).map(s => (
                  <div
                    key={s.id}
                    className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate ${
                      s.type === "recurring"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-accent text-accent-foreground border border-accent"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (s.type === "planned") setDeletingSession(s.id);
                    }}
                  >
                    <span className="font-medium">{s.time}</span> {s.title}
                  </div>
                ))}
                {day.sessions.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{day.sessions.length - 3} autres</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" />
          Cours récurrents (auto)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-accent border border-accent" />
          Séances planifiées (manuelles)
        </div>
      </div>

      {/* Add session dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Ajouter une séance — {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Type</Label>
              <Select value={sessionForm.source} onValueChange={(v) => handleSourceChange(v as "course" | "workshop" | "manual")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Cours existant</SelectItem>
                  <SelectItem value="workshop">Atelier existant</SelectItem>
                  <SelectItem value="manual">Saisie libre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sessionForm.source === "course" && (
              <div>
                <Label>Cours</Label>
                <Select value={sessionForm.sourceId} onValueChange={handleSourceIdChange}>
                  <SelectTrigger><SelectValue placeholder="Choisir un cours..." /></SelectTrigger>
                  <SelectContent>
                    {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sessionForm.source === "workshop" && (
              <div>
                <Label>Atelier</Label>
                <Select value={sessionForm.sourceId} onValueChange={handleSourceIdChange}>
                  <SelectTrigger><SelectValue placeholder="Choisir un atelier..." /></SelectTrigger>
                  <SelectContent>
                    {workshops.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Titre</Label>
              <Input
                value={sessionForm.title}
                onChange={e => setSessionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nom de la séance"
                disabled={sessionForm.source !== "manual" && !!sessionForm.sourceId}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Début</Label>
                <Input type="time" value={sessionForm.time} onChange={e => setSessionForm(prev => ({ ...prev, time: e.target.value }))} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="time" value={sessionForm.end_time} onChange={e => setSessionForm(prev => ({ ...prev, end_time: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label>Notes (optionnel)</Label>
              <Input
                value={sessionForm.notes}
                onChange={e => setSessionForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Remarques..."
              />
            </div>

            <Button className="w-full" onClick={saveSession} disabled={!sessionForm.title}>
              <Plus className="h-4 w-4 mr-1.5" /> Ajouter la séance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingSession} onOpenChange={(open) => !open && setDeletingSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
            <AlertDialogDescription>Cette séance planifiée sera définitivement supprimée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
