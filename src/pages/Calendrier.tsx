import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, Users, User, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import ActivityFilterBar, { type FilterCategory, CATEGORY_STYLES, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";

interface Course { id: string; name: string; description: string; category: string; instructor: string; }
interface Schedule { id: string; course_id: string; day: string; time: string; end_time: string; spots: number; spots_left: number; }
interface Workshop { id: string; name: string; description: string; category: string; date: string; time: string; end_time: string; duration: string; price: number; spots: number; spots_left: number; }

interface ActivityBlock {
  id: string; title: string; description: string; category: string;
  time: string; end_time: string; type: "course" | "workshop";
  instructor: string; spots: number; spotsLeft: number;
  sourceId: string; scheduleId?: string; price?: number;
}

const DAY_MAP: Record<number, string> = { 0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi", 4: "Jeudi", 5: "Vendredi", 6: "Samedi" };

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

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) { const dd = new Date(monday); dd.setDate(monday.getDate() + i); days.push(dd); }
  return days;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendrier() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") as FilterCategory | null;
  const targetDate = searchParams.get("date"); // auto-navigate to this date's week
  const activityName = searchParams.get("activity"); // specific activity name
  const [filter, setFilter] = useState<FilterCategory>(
    initialFilter && CATEGORY_FILTERS.some(f => f.value === initialFilter) ? initialFilter : "all"
  );
  const [subFilter, setSubFilter] = useState<string>(activityName || "all");
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityBlock | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // If a target date is provided, navigate to that week
    const base = targetDate ? new Date(targetDate + "T00:00:00") : new Date();
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(base);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [c, s, w] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("course_schedules").select("*"),
        supabase.from("workshops").select("*"),
      ]);
      if (c.data) setCourses(c.data as unknown as Course[]);
      if (s.data) setSchedules(s.data as unknown as Schedule[]);
      if (w.data) setWorkshops(w.data as unknown as Workshop[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Auto-scroll to first available date when arriving from Activités with an activity filter
  useEffect(() => {
    if (loading || (!activityName && !initialFilter)) return;
    // Use the loaded data to find the first matching date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr2 = formatDateStr(today);

    let earliestDate: Date | null = null;

    // Check workshops
    const matchingWs = workshops
      .filter(w => {
        if (w.date < todayStr2) return false;
        if (activityName && w.name !== activityName) return false;
        if (initialFilter && initialFilter !== "all" && w.category !== initialFilter) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (matchingWs.length > 0) {
      earliestDate = new Date(matchingWs[0].date + "T00:00:00");
    }

    // Check recurring courses
    const matchingScheds = schedules.filter(s => {
      const course = courses.find(c => c.id === s.course_id);
      if (!course) return false;
      if (activityName && course.name !== activityName) return false;
      if (initialFilter && initialFilter !== "all" && course.category !== initialFilter) return false;
      return true;
    });

    if (matchingScheds.length > 0) {
      const dayNames = matchingScheds.map(s => s.day);
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        if (dayNames.includes(DAY_MAP[d.getDay()])) {
          if (!earliestDate || d < earliestDate) earliestDate = d;
          break;
        }
      }
    }

    if (earliestDate) {
      const dayOfWeek = earliestDate.getDay();
      const diff = earliestDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(earliestDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentWeekStart(monday);
    }
  }, [loading, courses, schedules, workshops, activityName, initialFilter]);

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  const dayBlocks: { date: Date; blocks: ActivityBlock[] }[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return weekDays.map(date => {
      const blocks: ActivityBlock[] = [];
      if (date < today) return { date, blocks };
      const dayName = DAY_MAP[date.getDay()];
      const dateStr = formatDateStr(date);

      for (const sched of schedules) {
        if (sched.day !== dayName) continue;
        const course = courses.find(c => c.id === sched.course_id);
        if (!course) continue;
        if (filter !== "all" && course.category !== filter) continue;
        if (subFilter !== "all" && course.name !== subFilter) continue;
        blocks.push({
          id: `${sched.id}-${dateStr}`, title: course.name, description: course.description || "",
          category: course.category, time: sched.time, end_time: sched.end_time,
          type: "course", instructor: course.instructor || "Élodie",
          spots: sched.spots, spotsLeft: sched.spots_left, sourceId: course.id, scheduleId: sched.id,
        });
      }

      for (const ws of workshops) {
        if (ws.date !== dateStr) continue;
        if (filter !== "all" && ws.category !== filter) continue;
        if (subFilter !== "all" && ws.name !== subFilter) continue;
        blocks.push({
          id: ws.id, title: ws.name, description: ws.description || "",
          category: ws.category, time: ws.time, end_time: ws.end_time,
          type: "workshop", instructor: "Élodie",
          spots: ws.spots, spotsLeft: ws.spots_left, sourceId: ws.id, price: ws.price,
        });
      }

      blocks.sort((a, b) => a.time.localeCompare(b.time));
      return { date, blocks };
    });
  }, [weekDays, courses, schedules, workshops, filter, subFilter]);

  // Unique activity names for current category (for sub-filters)
  const subFilterOptions = useMemo(() => {
    if (filter === "all") return [];
    const names = new Set<string>();
    courses.filter(c => c.category === filter).forEach(c => names.add(c.name));
    workshops.filter(w => w.category === filter).forEach(w => names.add(w.name));
    return Array.from(names).sort();
  }, [filter, courses, workshops]);

  // Count total upcoming dates for the active filter
  const matchingDatesCount = useMemo(() => {
    if (filter === "all" && subFilter === "all") return 0;
    const today = formatDateStr(new Date());
    let count = 0;
    const filteredSchedules = schedules.filter(s => {
      const course = courses.find(c => c.id === s.course_id);
      if (!course) return false;
      if (filter !== "all" && course.category !== filter) return false;
      if (subFilter !== "all" && course.name !== subFilter) return false;
      return true;
    });
    for (let w = 0; w < 8; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date();
        date.setDate(date.getDate() + w * 7 + d);
        const dayName = DAY_MAP[date.getDay()];
        count += filteredSchedules.filter(s => s.day === dayName).length;
      }
    }
    count += workshops.filter(ws => {
      if (filter !== "all" && ws.category !== filter) return false;
      if (subFilter !== "all" && ws.name !== subFilter) return false;
      return ws.date >= today;
    }).length;
    return count;
  }, [filter, subFilter, courses, schedules, workshops]);

  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };
  const goThisWeek = () => { const now = new Date(); const day = now.getDay(); const diff = now.getDate() - day + (day === 0 ? -6 : 1); const m = new Date(now); m.setDate(diff); m.setHours(0, 0, 0, 0); setCurrentWeekStart(m); };

  const scrollToFirstMatch = (params: { category?: string; activityName?: string }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr2 = formatDateStr(today);

    // Find matching workshops (ponctuel)
    const matchingWs = workshops
      .filter(w => {
        if (w.date < todayStr2) return false;
        if (params.activityName && w.name !== params.activityName) return false;
        if (params.category && w.category !== params.category) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Find matching recurring schedules
    const matchingScheds = schedules.filter(s => {
      const course = courses.find(c => c.id === s.course_id);
      if (!course) return false;
      if (params.activityName && course.name !== params.activityName) return false;
      if (params.category && course.category !== params.category) return false;
      return true;
    });

    let earliestDate: Date | null = null;

    if (matchingWs.length > 0) {
      earliestDate = new Date(matchingWs[0].date + "T00:00:00");
    }

    if (matchingScheds.length > 0) {
      const dayNames = matchingScheds.map(s => s.day);
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        if (dayNames.includes(DAY_MAP[d.getDay()])) {
          if (!earliestDate || d < earliestDate) earliestDate = d;
          break;
        }
      }
    }

    if (earliestDate) {
      const dayOfWeek = earliestDate.getDay();
      const diff = earliestDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(earliestDate);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      setCurrentWeekStart(monday);
    }
  };

  const handleBook = (event: ActivityBlock, date: Date) => {
    const dateStr = formatDateStr(date);
    const params = new URLSearchParams({
      type: event.type,
      id: event.sourceId,
      date: dateStr,
    });
    if (event.scheduleId) params.set("scheduleId", event.scheduleId);
    navigate(`/reserver?${params.toString()}`);
  };

  const todayStr = formatDateStr(new Date());
  const isThisWeek = weekDays.some(d => formatDateStr(d) === todayStr);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* ─── Hero (mobile only) ─── */}
        <section className="relative overflow-hidden bg-secondary/30 py-12 md:hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-primary-dark mb-3">Bienvenue chez</p>
              <h1 className="text-4xl font-display font-bold text-primary-dark mb-3">
                MyIgi<span className="text-primary italic">Studio</span>
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed px-4">
                Yoga, Pilates, Poterie & Bien-être.<br />Réservez vos cours et ateliers en quelques clics.
              </p>
            </div>
          </div>
        </section>

        <div className="container max-w-5xl pt-6 pb-2 hidden md:block">
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-4xl font-display font-bold text-primary-dark mb-1">Planning des activités</h1>
            <p className="text-sm text-muted-foreground">Retrouvez toutes nos activités et réservez en un clic</p>
          </div>
        </div>

        {/* ─── Sticky filters ─── */}
        <ActivityFilterBar filter={filter} onFilterChange={(v) => { setFilter(v); setSubFilter("all"); if (v !== "all") scrollToFirstMatch({ category: v }); }} />

        {/* Sub-filters for specific activities within category */}
        {filter !== "all" && subFilterOptions.length > 1 && (
          <div className="container max-w-5xl pt-2 pb-0">
            <div className="flex flex-wrap items-center gap-1.5 justify-center">
              <Button
                variant={subFilter === "all" ? "default" : "outline"}
                size="sm"
                className="rounded-full h-6 text-[11px] px-3"
                onClick={() => setSubFilter("all")}
              >
                Tout voir
              </Button>
              {subFilterOptions.map(name => (
                <Button
                  key={name}
                  variant={subFilter === name ? "default" : "outline"}
                  size="sm"
                  className="rounded-full h-6 text-[11px] px-3"
                  onClick={() => {
                    const newVal = subFilter === name ? "all" : name;
                    setSubFilter(newVal);
                    if (newVal !== "all") {
                      scrollToFirstMatch({ activityName: newVal, category: filter as string === "all" ? undefined : filter });
                    }
                  }}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {(filter !== "all" || subFilter !== "all") && matchingDatesCount > 0 && (
          <div className="container max-w-5xl pt-2 pb-0">
            <Badge variant="secondary" className="text-xs font-medium">
              {matchingDatesCount} date{matchingDatesCount > 1 ? "s" : ""} trouvée{matchingDatesCount > 1 ? "s" : ""}
              {subFilter !== "all" ? ` pour ${subFilter}` : ""}
            </Badge>
          </div>
        )}

        <div className="container max-w-5xl py-6">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" size="icon" onClick={prevWeek} disabled={isThisWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-semibold">
                Semaine du {weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                {" "} au {weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              {!isThisWeek && (
                <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-0.5" onClick={goThisWeek}>Revenir à cette semaine</Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week view */}
          <div className="space-y-4">
            {dayBlocks.filter(({ date }) => date >= new Date(new Date().setHours(0, 0, 0, 0))).map(({ date, blocks }) => {
              const isToday = formatDateStr(date) === todayStr;
              return (
                <div key={formatDateStr(date)}>
                  <div className={`flex items-center gap-3 mb-2 ${isToday ? "text-primary-dark" : "text-foreground"}`}>
                    <div className={`text-sm font-semibold capitalize ${isToday ? "bg-primary-dark text-primary-dark-foreground px-3 py-1 rounded-full" : ""}`}>
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    {isToday && <Badge variant="outline" className="text-xs">Aujourd'hui</Badge>}
                  </div>

                  {blocks.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-center text-sm text-muted-foreground">Aucune activité</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {blocks.map(block => {
                        const style = CATEGORY_STYLES[block.category] || { block: "bg-muted border-border text-foreground", dot: "bg-muted-foreground" };
                        return (
                          <div key={block.id} className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${style.block} ${block.spotsLeft === 0 ? "opacity-60" : ""}`} onClick={() => setSelectedEvent(block)}>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-sm">{block.title}</h4>
                              {block.spotsLeft === 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Complet</Badge>}
                            </div>
                            <div className="flex items-center gap-3 text-xs opacity-80">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{block.time} - {block.end_time}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{block.spotsLeft === 0 ? "Complet" : `${block.spotsLeft} place${block.spotsLeft > 1 ? "s" : ""}`}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1.5 text-xs opacity-70"><User className="h-3 w-3" />{block.instructor}</div>
                            {block.price !== undefined && block.price > 0 && <div className="mt-1.5 text-sm font-bold">{block.price}€</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-8 text-xs text-muted-foreground justify-center">
            {Object.entries(CATEGORY_STYLES).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${val.dot}`} />
                {key === "yoga" ? "Yoga & Pilates" : key === "poterie" ? "Poterie" : "Bien-être"}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {/* Detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{selectedEvent.category}</Badge>
                  <Badge variant="secondary" className="text-xs">{selectedEvent.type === "course" ? "Cours" : "Atelier"}</Badge>
                </div>
                <DialogTitle className="font-display text-xl mt-2">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {selectedEvent.description && <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.description}</p>}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>{selectedEvent.time} - {selectedEvent.end_time} · {calcDuration(selectedEvent.time, selectedEvent.end_time)}</span></div>
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{selectedEvent.instructor}</span></div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {selectedEvent.spotsLeft === 0 ? <span className="text-destructive font-medium">Complet</span> : <span>{selectedEvent.spotsLeft} place{selectedEvent.spotsLeft > 1 ? "s" : ""} disponible{selectedEvent.spotsLeft > 1 ? "s" : ""}</span>}
                  </div>
                  {selectedEvent.price !== undefined && selectedEvent.price > 0 && <div className="text-lg font-bold text-primary-dark">{selectedEvent.price}€</div>}
                </div>
                <Button className="w-full gap-1.5" disabled={selectedEvent.spotsLeft === 0} onClick={() => {
                  const eventDate = dayBlocks.find(db => db.blocks.some(b => b.id === selectedEvent.id))?.date || new Date();
                  setSelectedEvent(null);
                  handleBook(selectedEvent, eventDate);
                }}>
                  {selectedEvent.spotsLeft === 0 ? "Complet" : (<>Réserver <ArrowRight className="h-4 w-4" /></>)}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
