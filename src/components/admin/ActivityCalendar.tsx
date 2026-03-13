import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, CalendarDays, List } from "lucide-react";
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
  date: string;
  time: string;
  end_time: string;
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

interface SessionEntry {
  id: string;
  title: string;
  time: string;
  end_time: string;
  type: "recurring" | "planned" | "workshop";
  category?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  sessions: SessionEntry[];
}

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAY_MAP: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

const CATEGORY_COLORS: Record<string, string> = {
  yoga: "bg-primary/10 text-primary-dark border-primary/20",
  poterie: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  "bien-etre": "bg-accent/15 text-accent-foreground border-accent/25",
};

function getDayName(date: Date): string {
  const jsDay = date.getDay();
  return DAY_NAMES[jsDay === 0 ? 6 : jsDay - 1];
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: CalendarDay[] = [];
  let jsDay = firstDay.getDay();
  let startOffset = jsDay === 0 ? 6 : jsDay - 1;
  for (let i = -startOffset; i <= lastDay.getDate() + (6 - (lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1)); i++) {
    const d = new Date(year, month, i + 1);
    if (days.length >= 42) break;
    days.push({ date: d, isCurrentMonth: d.getMonth() === month, isToday: d.getTime() === today.getTime(), sessions: [] });
  }
  while (days.length % 7 !== 0 && days.length < 42) {
    const lastDate = days[days.length - 1].date;
    const d = new Date(lastDate); d.setDate(d.getDate() + 1);
    days.push({ date: d, isCurrentMonth: false, isToday: false, sessions: [] });
  }
  return days;
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d); monday.setDate(diff); monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday); dd.setDate(monday.getDate() + i); days.push(dd);
  }
  return days;
}

type ViewMode = "today" | "week" | "month";

export default function ActivityCalendar() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
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
      supabase.from("workshops").select("id, name, category, date, time, end_time"),
      supabase.from("planned_sessions").select("*"),
    ]);
    if (schedulesRes.data) setSchedules(schedulesRes.data as Schedule[]);
    if (coursesRes.data) setCourses(coursesRes.data as CourseInfo[]);
    if (workshopsRes.data) setWorkshops(workshopsRes.data as unknown as WorkshopInfo[]);
    if (sessionsRes.data) setPlannedSessions(sessionsRes.data as PlannedSession[]);
  };

  useEffect(() => { fetchData(); }, []);

  const courseMap = useMemo(() => {
    const m: Record<string, { name: string; category: string }> = {};
    courses.forEach(c => { m[c.id] = { name: c.name, category: c.category }; });
    return m;
  }, [courses]);

  // Build sessions for a given date
  const getSessionsForDate = (date: Date): SessionEntry[] => {
    const sessions: SessionEntry[] = [];
    const dayName = getDayName(date);
    const dateStr = formatDateStr(date);

    // Recurring schedules
    const matchingSchedules = schedules.filter(s => s.day === dayName);
    for (const s of matchingSchedules) {
      const info = courseMap[s.course_id];
      sessions.push({
        id: `rec-${s.id}-${dateStr}`,
        title: info?.name || "Cours",
        time: s.time,
        end_time: s.end_time,
        type: "recurring",
        category: info?.category,
      });
    }

    // Workshops
    for (const ws of workshops) {
      if (ws.date === dateStr) {
        sessions.push({
          id: `ws-${ws.id}-${dateStr}`,
          title: ws.name,
          time: ws.time,
          end_time: ws.end_time,
          type: "workshop",
          category: ws.category,
        });
      }
    }

    // Planned sessions
    const dayPlanned = plannedSessions.filter(ps => ps.date === dateStr);
    for (const ps of dayPlanned) {
      const info = ps.course_id ? courseMap[ps.course_id] : null;
      sessions.push({
        id: ps.id,
        title: ps.title || info?.name || "Séance",
        time: ps.time,
        end_time: ps.end_time,
        type: "planned",
        category: info?.category,
      });
    }

    sessions.sort((a, b) => a.time.localeCompare(b.time));
    return sessions;
  };

  // Today view
  const todaySessions = useMemo(() => getSessionsForDate(new Date()), [schedules, plannedSessions, courseMap, workshops]);

  // Week view
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const weekData = useMemo(() => weekDays.map(d => ({
    date: d,
    sessions: getSessionsForDate(d),
  })), [weekDays, schedules, plannedSessions, courseMap, workshops]);

  // Month view
  const calendarDays = useMemo(() => {
    const days = getMonthDays(year, month);
    for (const day of days) {
      day.sessions = getSessionsForDate(day.date);
    }
    return days;
  }, [year, month, schedules, plannedSessions, courseMap, workshops]);

  const prevNav = () => {
    if (viewMode === "today") {
      const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);
    } else if (viewMode === "week") {
      const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };
  const nextNav = () => {
    if (viewMode === "today") {
      const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d);
    } else if (viewMode === "week") {
      const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };
  const goToday = () => setCurrentDate(new Date());

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
    const dateStr = formatDateStr(selectedDate);
    const payload: Record<string, unknown> = {
      title: sessionForm.title, date: dateStr, time: sessionForm.time, end_time: sessionForm.end_time, notes: sessionForm.notes,
    };
    if (sessionForm.source === "course" && sessionForm.sourceId) payload.course_id = sessionForm.sourceId;
    if (sessionForm.source === "workshop" && sessionForm.sourceId) payload.workshop_id = sessionForm.sourceId;
    await supabase.from("planned_sessions").insert(payload as any);
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

  const getNavTitle = () => {
    if (viewMode === "today") {
      return currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (viewMode === "week") {
      return `Semaine du ${weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
    }
    return `${MONTH_NAMES[month]} ${year}`;
  };

  const isToday = formatDateStr(currentDate) === formatDateStr(new Date());
  const todayStr = formatDateStr(new Date());

  const renderSessionBlock = (s: SessionEntry, clickDate?: Date) => {
    const colorClass = s.category ? (CATEGORY_COLORS[s.category] || "bg-muted text-foreground border-border") :
      s.type === "planned" ? "bg-accent/15 text-accent-foreground border-accent/25" : "bg-primary/10 text-primary-dark border-primary/20";

    return (
      <div
        key={s.id}
        className={`rounded-lg border-2 p-3 cursor-pointer transition-all hover:shadow-sm ${colorClass}`}
        onClick={(e) => {
          e.stopPropagation();
          if (s.type === "planned") setDeletingSession(s.id);
          else if (clickDate) openAddSession(clickDate);
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{s.title}</span>
          {s.type === "planned" && <Trash2 className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />}
        </div>
        <div className="flex items-center gap-2 text-xs mt-1 opacity-80">
          <Clock className="h-3 w-3" />
          {s.time} - {s.end_time}
        </div>
        <div className="mt-1">
          <Badge variant="outline" className="text-[10px]">
            {s.type === "recurring" ? "Récurrent" : s.type === "workshop" ? "Atelier" : "Planifié"}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <Button variant={viewMode === "today" ? "default" : "outline"} size="sm" onClick={() => { setViewMode("today"); setCurrentDate(new Date()); }}>
          Aujourd'hui
        </Button>
        <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => { setViewMode("week"); setCurrentDate(new Date()); }}>
          Semaine
        </Button>
        <Button variant={viewMode === "month" ? "default" : "outline"} size="sm" onClick={() => setViewMode("month")}>
          <CalendarDays className="h-4 w-4 mr-1" /> Mois
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevNav}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <h3 className="text-lg font-semibold capitalize">{getNavTitle()}</h3>
          {!isToday && viewMode !== "month" && (
            <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={goToday}>Aujourd'hui</Button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={nextNav}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* TODAY VIEW */}
      {viewMode === "today" && (
        <div className="space-y-2">
          {todaySessions.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center text-muted-foreground">
              Aucune activité programmée.
              <br />
              <Button variant="link" size="sm" className="mt-2" onClick={() => openAddSession(currentDate)}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter une séance
              </Button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {todaySessions.map(s => renderSessionBlock(s, currentDate))}
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => openAddSession(currentDate)}>
            <Plus className="h-3 w-3" /> Ajouter une séance
          </Button>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === "week" && (
        <div className="space-y-4">
          {weekData.map(({ date, sessions }) => {
            const isT = formatDateStr(date) === todayStr;
            return (
              <div key={formatDateStr(date)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold capitalize ${isT ? "bg-primary-dark text-primary-dark-foreground px-3 py-1 rounded-full" : ""}`}>
                    {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                  </span>
                  {isT && <Badge variant="outline" className="text-xs">Aujourd'hui</Badge>}
                  <Button variant="ghost" size="sm" className="h-6 text-xs ml-auto gap-1" onClick={() => openAddSession(date)}>
                    <Plus className="h-3 w-3" /> Ajouter
                  </Button>
                </div>
                {sessions.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/10 p-3 text-center text-xs text-muted-foreground">
                    Aucune activité
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {sessions.map(s => renderSessionBlock(s, date))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {DAY_NAMES.map(d => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d.slice(0, 3)}</div>
              ))}
            </div>
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
                    {day.sessions.slice(0, 3).map(s => {
                      const colorClass = s.category ? (CATEGORY_COLORS[s.category] || "bg-muted text-foreground border-border") :
                        s.type === "planned" ? "bg-accent/15 text-accent-foreground border-accent/25" : "bg-primary/10 text-primary border-primary/20";
                      return (
                        <div
                          key={s.id}
                          className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate border ${colorClass}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (s.type === "planned") setDeletingSession(s.id);
                          }}
                        >
                          <span className="font-medium">{s.time}</span> {s.title}
                        </div>
                      );
                    })}
                    {day.sessions.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{day.sessions.length - 3}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" /> Yoga
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-secondary/20 border border-secondary/30" /> Poterie
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-accent/15 border border-accent/25" /> Bien-être
            </div>
          </div>
        </>
      )}

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
              <div><Label>Début</Label><Input type="time" value={sessionForm.time} onChange={e => setSessionForm(prev => ({ ...prev, time: e.target.value }))} /></div>
              <div><Label>Fin</Label><Input type="time" value={sessionForm.end_time} onChange={e => setSessionForm(prev => ({ ...prev, end_time: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Notes (optionnel)</Label>
              <Input value={sessionForm.notes} onChange={e => setSessionForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Remarques..." />
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
