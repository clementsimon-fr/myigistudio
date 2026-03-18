import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, Users, User, ArrowRight, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CATEGORY_STYLES, CATEGORY_FILTERS, type FilterCategory } from "@/components/ActivityFilterBar";
import ContactElodieButton from "@/components/ContactElodieButton";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

interface ActivityBlock {
  id: string; title: string; description: string; category: string;
  time: string; end_time: string; type: "course" | "workshop";
  instructor: string; spots: number; spotsLeft: number;
  sourceId: string; scheduleId?: string; price?: number;
  long_description?: string; inclusions?: string; frequency?: string;
  instructor_id?: string | null;
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

interface PlanningViewProps {
  courses: Course[];
  schedules: Schedule[];
  workshops: Workshop[];
  filter: FilterCategory;
  initialActivity?: string | null;
  initialDate?: string | null;
  subFilter: string;
  onSubFilterChange: (value: string) => void;
}

export default function PlanningView({ courses, schedules, workshops, filter, initialActivity, initialDate, subFilter, onSubFilterChange }: PlanningViewProps) {
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<ActivityBlock | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [instructorDetail, setInstructorDetail] = useState<{ name: string; photo_url: string; bio: string } | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const base = initialDate ? new Date(initialDate + "T00:00:00") : new Date();
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(base);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Load instructor details when showing more info
  useEffect(() => {
    if (!showMore || !selectedEvent) { setInstructorDetail(null); return; }
    const instrId = selectedEvent.instructor_id;
    if (!instrId) { setInstructorDetail(null); return; }
    supabase.from("instructors").select("name, photo_url, bio").eq("id", instrId).single()
      .then(({ data }) => { if (data) setInstructorDetail(data as any); });
  }, [showMore, selectedEvent]);

  const scrollToFirstMatch = (params: { category?: string; activityName?: string }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDateStr(today);
    const matchingWs = workshops
      .filter(w => {
        if (w.date < todayStr) return false;
        if (params.activityName && w.name !== params.activityName) return false;
        if (params.category && w.category !== params.category) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const matchingScheds = schedules.filter(s => {
      const course = courses.find(c => c.id === s.course_id);
      if (!course) return false;
      if (params.activityName && course.name !== params.activityName) return false;
      if (params.category && course.category !== params.category) return false;
      return true;
    });
    let earliestDate: Date | null = null;
    if (matchingWs.length > 0) earliestDate = new Date(matchingWs[0].date + "T00:00:00");
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

  useEffect(() => {
    if (!initialActivity && filter === "all") return;
    scrollToFirstMatch({ activityName: initialActivity || undefined, category: filter !== "all" ? filter : undefined });
  }, [initialActivity, filter, courses, schedules, workshops]);

  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

  const dayBlocks = useMemo(() => {
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
          long_description: course.long_description || "", inclusions: (sched as any).inclusions || "",
          frequency: course.frequency || "hebdomadaire", instructor_id: course.instructor_id,
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
          long_description: ws.long_description || "", inclusions: ws.inclusions || "",
          frequency: ws.frequency || "ponctuel", instructor_id: ws.instructor_id,
        });
      }

      blocks.sort((a, b) => a.time.localeCompare(b.time));
      return { date, blocks };
    });
  }, [weekDays, courses, schedules, workshops, filter, subFilter]);

  const subFilterOptions = useMemo(() => {
    if (filter === "all") return [];
    const names = new Set<string>();
    courses.filter(c => c.category === filter).forEach(c => names.add(c.name));
    workshops.filter(w => w.category === filter).forEach(w => names.add(w.name));
    return Array.from(names).sort();
  }, [filter, courses, workshops]);

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

  const handleSubFilterChange = (name: string) => {
    onSubFilterChange(name);
    if (name !== "all") {
      scrollToFirstMatch({ activityName: name, category: filter !== "all" ? filter : undefined });
    }
  };

  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };
  const goThisWeek = () => { const now = new Date(); const day = now.getDay(); const diff = now.getDate() - day + (day === 0 ? -6 : 1); const m = new Date(now); m.setDate(diff); m.setHours(0, 0, 0, 0); setCurrentWeekStart(m); };

  const handleBook = (event: ActivityBlock, date: Date) => {
    const dateStr = formatDateStr(date);
    const params = new URLSearchParams({ type: event.type, id: event.sourceId, date: dateStr });
    if (event.scheduleId) params.set("scheduleId", event.scheduleId);
    navigate(`/reserver?${params.toString()}`);
  };

  const todayStr = formatDateStr(new Date());
  const isThisWeek = weekDays.some(d => formatDateStr(d) === todayStr);

  return (
    <>
      <div className="container max-w-5xl pt-6 pb-2 hidden md:block">
        <div className="text-center mb-4">
          <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-dark mb-1">Planning des activités</h2>
          <p className="text-sm text-muted-foreground">Retrouvez toutes nos activités et réservez en un clic</p>
        </div>
      </div>

      {(filter !== "all" || subFilter !== "all") && matchingDatesCount > 0 && (
        <div className="container max-w-5xl pt-2 pb-0">
          <Badge variant="secondary" className="text-xs font-medium">
            {matchingDatesCount} date{matchingDatesCount > 1 ? "s" : ""} trouvée{matchingDatesCount > 1 ? "s" : ""}
            {subFilter !== "all" ? ` pour ${subFilter}` : ""}
          </Badge>
        </div>
      )}

      <div className="container max-w-5xl py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={prevWeek} disabled={isThisWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <h3 className="text-sm md:text-lg font-semibold">
              Semaine du {weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              {" "} au {weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </h3>
            {!isThisWeek && <Button variant="link" size="sm" className="text-xs h-auto p-0 mt-0.5" onClick={goThisWeek}>Revenir à cette semaine</Button>}
          </div>
          <Button variant="outline" size="icon" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-4">
          {dayBlocks.filter(({ date }) => date >= new Date(new Date().setHours(0, 0, 0, 0))).map(({ date, blocks }) => {
            const isToday = formatDateStr(date) === todayStr;
            return (
              <div key={formatDateStr(date)}>
                <div className={`flex items-center gap-3 mb-2 ${isToday ? "text-primary-dark" : "text-foreground"}`}>
                  <div className={`text-sm font-semibold capitalize ${isToday ? "bg-primary-dark text-primary-dark-foreground px-3 py-1 rounded-full" : ""}`}>
                    {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </div>
                </div>
                {blocks.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-center text-sm text-muted-foreground">Aucune activité</div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {blocks.map(block => {
                      const style = CATEGORY_STYLES[block.category] || { block: "bg-muted border-border text-foreground", dot: "bg-muted-foreground" };
                      return (
                        <div key={block.id} className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${style.block} ${block.spotsLeft === 0 ? "opacity-60" : ""}`} onClick={() => { setSelectedEvent(block); setShowMore(false); }}>
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

        <div className="flex flex-wrap items-center gap-4 mt-8 text-xs text-muted-foreground justify-center">
          {Object.entries(CATEGORY_STYLES).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${val.dot}`} />
              {key === "yoga" ? "Yoga & Pilates" : key === "poterie" ? "Poterie" : "Bien-être"}
            </div>
          ))}
          <ContactElodieButton variant="ghost" className="text-xs" />
        </div>
      </div>

      {/* Detail dialog — badge "Cours"/"Atelier" REMOVED + "Afficher plus d'informations" added */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) { setSelectedEvent(null); setShowMore(false); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {selectedEvent.description && <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.description}</p>}

                {/* "Afficher plus d'informations" toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs font-semibold border-primary/30 text-primary-dark"
                  onClick={() => setShowMore(!showMore)}
                >
                  <Info className="h-3.5 w-3.5" />
                  {showMore ? "Masquer les informations" : "Afficher plus d'informations"}
                  {showMore ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>

                {showMore && (
                  <div className="space-y-3 rounded-lg bg-muted/30 p-3 border">
                    {selectedEvent.long_description && (
                      <div>
                        <p className="text-xs font-semibold text-primary-dark mb-1">Description détaillée</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{selectedEvent.long_description}</p>
                      </div>
                    )}
                    {selectedEvent.inclusions && (
                      <div>
                        <p className="text-xs font-semibold text-primary-dark mb-1">Inclus dans le prix</p>
                        <p className="text-xs text-muted-foreground">{selectedEvent.inclusions}</p>
                      </div>
                    )}
                    {instructorDetail && (
                      <div>
                        <p className="text-xs font-semibold text-primary-dark mb-1">Intervenant</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            {instructorDetail.photo_url && <AvatarImage src={instructorDetail.photo_url} />}
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">{instructorDetail.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium">{instructorDetail.name}</p>
                            {instructorDetail.bio && <p className="text-[11px] text-muted-foreground line-clamp-2">{instructorDetail.bio}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />{selectedEvent.time} – {selectedEvent.end_time} ({calcDuration(selectedEvent.time, selectedEvent.end_time)})</div>
                  <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />{selectedEvent.spotsLeft} place{selectedEvent.spotsLeft > 1 ? "s" : ""} restante{selectedEvent.spotsLeft > 1 ? "s" : ""}</div>
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{selectedEvent.instructor}</div>
                  {selectedEvent.price !== undefined && selectedEvent.price > 0 && <div className="text-lg font-bold text-primary-dark">{selectedEvent.price}€</div>}
                </div>
                {selectedEvent.spotsLeft > 0 && (() => {
                  const matchingDay = dayBlocks.find(db => db.blocks.some(b => b.id === selectedEvent.id));
                  return matchingDay ? (
                    <Button className="w-full gap-2" onClick={() => { handleBook(selectedEvent, matchingDay.date); setSelectedEvent(null); }}>
                      Réserver <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}