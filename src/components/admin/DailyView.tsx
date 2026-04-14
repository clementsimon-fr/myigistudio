import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, Users, User, CalendarDays, CalendarRange, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import { useToast } from "@/hooks/use-toast";

interface Reservation {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  date: string;
  time: string;
  end_time: string;
  participants: number;
  status: string;
  schedule_id: string | null;
  course_id: string | null;
  workshop_id: string | null;
}

interface Schedule {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface Course {
  id: string;
  name: string;
  category: string;
  instructor: string;
}

interface Workshop {
  id: string;
  name: string;
  category: string;
  date: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface ActivityBlock {
  id: string;
  title: string;
  category: string;
  time: string;
  end_time: string;
  type: "course" | "workshop";
  spots: number;
  spotsLeft: number;
  instructor?: string;
  reservations: Reservation[];
}

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return days;
}

interface DailyViewProps {
  categoryFilter?: string;
}

export default function DailyView({ categoryFilter = "all" }: DailyViewProps) {
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<ActivityBlock | null>(null);

  const dateStr = useMemo(() => formatDateStr(currentDate), [currentDate]);
  const dayName = DAY_NAMES[currentDate.getDay()];
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const todayStr = formatDateStr(new Date());

  const fetchData = async () => {
    setLoading(true);
    if (viewMode === "daily") {
      const [resaRes, schedRes, courseRes, wsRes] = await Promise.all([
        supabase.from("reservations").select("*").eq("date", dateStr),
        supabase.from("course_schedules").select("*"),
        supabase.from("courses").select("id, name, category, instructor"),
        supabase.from("workshops").select("*"),
      ]);
      if (resaRes.data) setReservations(resaRes.data as unknown as Reservation[]);
      if (schedRes.data) setSchedules(schedRes.data as unknown as Schedule[]);
      if (courseRes.data) setCourses(courseRes.data as unknown as Course[]);
      if (wsRes.data) setWorkshops(wsRes.data as unknown as Workshop[]);
    } else {
      const weekStart = formatDateStr(weekDays[0]);
      const weekEnd = formatDateStr(weekDays[6]);
      const [resaRes, schedRes, courseRes, wsRes] = await Promise.all([
        supabase.from("reservations").select("*").gte("date", weekStart).lte("date", weekEnd),
        supabase.from("course_schedules").select("*"),
        supabase.from("courses").select("id, name, category, instructor"),
        supabase.from("workshops").select("*"),
      ]);
      if (resaRes.data) setAllReservations(resaRes.data as unknown as Reservation[]);
      if (schedRes.data) setSchedules(schedRes.data as unknown as Schedule[]);
      if (courseRes.data) setCourses(courseRes.data as unknown as Course[]);
      if (wsRes.data) setWorkshops(wsRes.data as unknown as Workshop[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateStr, viewMode, currentDate]);

  const buildBlocks = (date: Date, resas: Reservation[]): ActivityBlock[] => {
    const result: ActivityBlock[] = [];
    const dn = DAY_NAMES[date.getDay()];
    const ds = formatDateStr(date);

    const daySchedules = schedules.filter(s => s.day === dn);
    for (const sched of daySchedules) {
      const course = courses.find(c => c.id === sched.course_id);
      if (!course) continue;
      if (categoryFilter !== "all" && course.category !== categoryFilter) continue;
      const matchingResas = resas.filter(r =>
        r.status === "confirmé" && (
          r.schedule_id === sched.id ||
          (!r.schedule_id && r.course_id === sched.course_id && r.date === ds) ||
          (!r.schedule_id && !r.course_id && r.activity_name.trim().toLowerCase().includes(course.name.trim().toLowerCase()) && r.date === ds)
        )
      );
      result.push({
        id: `${sched.id}-${ds}`,
        title: course.name,
        category: course.category,
        time: sched.time,
        end_time: sched.end_time,
        type: "course",
        spots: sched.spots,
        spotsLeft: sched.spots_left,
        instructor: course.instructor,
        reservations: matchingResas,
      });
    }

    const dayWorkshops = workshops.filter(w => w.date === ds);
    for (const ws of dayWorkshops) {
      if (categoryFilter !== "all" && ws.category !== categoryFilter) continue;
      const matchingResas = resas.filter(r =>
        r.status === "confirmé" && (
          r.workshop_id === ws.id ||
          (!r.workshop_id && r.activity_name.trim().toLowerCase().includes(ws.name.trim().toLowerCase()) && r.date === ds)
        )
      );
      result.push({
        id: ws.id,
        title: ws.name,
        category: ws.category,
        time: ws.time,
        end_time: ws.end_time,
        type: "workshop",
        spots: ws.spots,
        spotsLeft: ws.spots_left,
        reservations: matchingResas,
      });
    }

    result.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return result;
  };

  const blocks = useMemo(() => buildBlocks(currentDate, reservations), [dayName, dateStr, schedules, courses, workshops, reservations, categoryFilter]);

  const weekBlocks = useMemo(() => {
    if (viewMode !== "weekly") return [];
    return weekDays.map(date => ({
      date,
      blocks: buildBlocks(date, allReservations.filter(r => r.date === formatDateStr(date))),
    }));
  }, [weekDays, viewMode, schedules, courses, workshops, allReservations, categoryFilter]);

  const prevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const nextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };
  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const goToday = () => setCurrentDate(new Date());

  const isToday = dateStr === todayStr;

  const renderBlock = (block: ActivityBlock) => {
    const totalParticipants = block.reservations.reduce((sum, r) => sum + r.participants, 0);
    const style = CATEGORY_STYLES[block.category] || { block: "bg-muted border-border text-foreground", dot: "bg-muted-foreground" };
    const fillPct = block.spots > 0 ? Math.round((totalParticipants / block.spots) * 100) : 0;

    return (
      <div
        key={block.id}
        className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${style.block}`}
        onClick={() => setSelectedBlock(block)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm">{block.title}</h4>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {block.type === "course" ? "Cours" : "Atelier"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs opacity-80">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {block.time} - {block.end_time}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalParticipants}/{block.spots}
          </span>
        </div>
        {/* Fill progress bar */}
        <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fillPct >= 80 ? "bg-destructive/60" : fillPct >= 40 ? "bg-primary/50" : "bg-primary/30"}`}
            style={{ width: `${Math.max(fillPct, 2)}%` }}
          />
        </div>
        {block.instructor && (
          <div className="flex items-center gap-1 mt-1.5 text-xs opacity-70">
            <User className="h-3 w-3" />{block.instructor}
          </div>
        )}
        {block.reservations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <div className="flex flex-wrap gap-1.5">
              {block.reservations.slice(0, 4).map(r => (
                <Badge key={r.id} variant="outline" className="text-xs bg-background/60">
                  {r.client_name} {r.participants > 1 && `(×${r.participants})`}
                </Badge>
              ))}
              {block.reservations.length > 4 && (
                <Badge variant="outline" className="text-xs bg-background/60">
                  +{block.reservations.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "daily" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => { setViewMode("daily"); setCurrentDate(new Date()); }}
        >
          <CalendarDays className="h-4 w-4" /> Aujourd'hui
        </Button>
        <Button
          variant={viewMode === "weekly" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setViewMode("weekly")}
        >
          <CalendarRange className="h-4 w-4" /> Semaine
        </Button>
      </div>

      {viewMode === "daily" ? (
        <>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-semibold capitalize">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              Aucune activité programmée ce jour.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {blocks.map(renderBlock)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-semibold">
                Semaine du {weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                {" "}au {weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              {!weekDays.some(d => formatDateStr(d) === todayStr) && (
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={goToday}>
                  Cette semaine
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {weekBlocks.map(({ date, blocks: dayBlks }) => {
              const isDayToday = formatDateStr(date) === todayStr;
              return (
                <div key={formatDateStr(date)}>
                  <div className={`flex items-center gap-3 mb-2 ${isDayToday ? "text-primary-dark" : "text-foreground"}`}>
                    <div className={`text-sm font-semibold capitalize ${isDayToday ? "bg-primary-dark text-primary-dark-foreground px-3 py-1 rounded-full" : ""}`}>
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    {isDayToday && <Badge variant="outline" className="text-xs">Aujourd'hui</Badge>}
                  </div>
                  {dayBlks.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                      Aucune activité
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {dayBlks.map(renderBlock)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">{selectedBlock?.category}</Badge>
              <Badge variant="secondary" className="text-xs">{selectedBlock?.type === "course" ? "Cours" : "Atelier"}</Badge>
            </div>
            <DialogTitle className="font-display text-xl mt-2">{selectedBlock?.title}</DialogTitle>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedBlock.time} - {selectedBlock.end_time}</span>
                {selectedBlock.instructor && <span>· {selectedBlock.instructor}</span>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {selectedBlock.reservations.reduce((s, r) => s + r.participants, 0)} / {selectedBlock.spots} participants
                    </span>
                  </div>
                </div>
                {/* Fill bar in detail */}
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${selectedBlock.spots > 0 ? Math.round((selectedBlock.reservations.reduce((s, r) => s + r.participants, 0) / selectedBlock.spots) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-3">Participants inscrits</h4>
                {selectedBlock.reservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun participant inscrit.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBlock.reservations.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-dark" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.participants} personne{r.participants > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge className="text-xs" variant={r.status === "confirmé" ? "default" : "destructive"}>
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
