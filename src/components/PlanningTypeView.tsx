import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Schedule, Workshop } from "@/hooks/useActivitiesData";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

export interface PlanningTypeViewHandle {
  openAndScroll: () => void;
}

interface PlanningTypeViewProps {
  courses: Course[];
  schedules: Schedule[];
  workshops?: Workshop[];
  filter?: string;
  compact?: boolean;
  onEventClick?: (params: { type: "course" | "workshop"; name: string; id?: string; date?: string }) => void;
}

function formatTime(t: string): string {
  return t?.slice(0, 5).replace(":", "h") || "";
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || CATEGORY_STYLES["yoga"];
}

function getCategoryLabel(category: string): string {
  if (category === "yoga") return "Yoga";
  if (category === "poterie") return "Poterie";
  if (category === "bien-etre") return "Atelier";
  return category;
}

// ─── Week helpers ───

function getWeekBounds(): { monday: Date; sunday: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function dayNameToIndex(day: string): number {
  return DAYS.indexOf(day);
}

interface WeekEvent {
  date: Date;
  dateStr: string;
  time: string;
  endTime: string;
  name: string;
  category: string;
  type: "course" | "workshop";
  id?: string;
  price?: number;
  spotsLeft?: number;
}

function WeekProgram({ courses, schedules, workshops, onEventClick }: {
  courses: Course[]; schedules: Schedule[]; workshops: Workshop[];
  onEventClick?: PlanningTypeViewProps["onEventClick"];
}) {
  const events = useMemo(() => {
    const { monday, sunday } = getWeekBounds();
    const result: WeekEvent[] = [];

    const courseMap = new Map(courses.map(c => [c.id, c]));
    for (const s of schedules) {
      const course = courseMap.get(s.course_id);
      if (!course) continue;
      const dayIdx = dayNameToIndex(s.day);
      if (dayIdx < 0) continue;
      const eventDate = new Date(monday);
      eventDate.setDate(monday.getDate() + dayIdx);
      result.push({
        date: eventDate,
        dateStr: eventDate.toISOString().slice(0, 10),
        time: s.time,
        endTime: s.end_time,
        name: course.name,
        category: course.category,
        type: "course",
        id: course.id,
      });
    }

    for (const w of workshops) {
      const wDate = new Date(w.date + "T12:00:00");
      if (wDate >= monday && wDate <= sunday) {
        result.push({
          date: wDate,
          dateStr: w.date,
          time: w.time,
          endTime: w.end_time,
          name: w.name,
          category: w.category,
          type: "workshop",
          id: w.id,
          price: w.price,
          spotsLeft: w.spots_left,
        });
      }
    }

    result.sort((a, b) => {
      const dateDiff = a.date.getTime() - b.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      return (a.time || "").localeCompare(b.time || "");
    });

    return result;
  }, [courses, schedules, workshops]);

  const grouped = useMemo(() => {
    if (events.length === 0) return [];
    const map = new Map<string, WeekEvent[]>();
    for (const e of events) {
      const key = e.dateStr;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [events]);

  if (grouped.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Aucun événement cette semaine.</p>;
  }

  const handleClick = (e: WeekEvent) => {
    if (!onEventClick) return;
    onEventClick({
      type: e.type,
      name: e.name,
      id: e.id,
      date: e.type === "workshop" ? e.dateStr : undefined,
    });
  };

  return (
    <div className="space-y-1">
      {grouped.map(([dateStr, dayEvents]) => (
        <div key={dateStr}>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-2 pb-1 px-1">
            {formatDateShort(dateStr)}
          </div>
          <div className="space-y-1">
            {dayEvents.map((e, i) => {
              const style = getCategoryStyle(e.category);
              return (
                <button
                  key={`${dateStr}-${i}`}
                  onClick={() => handleClick(e)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border text-xs hover:bg-muted/50 transition-colors cursor-pointer text-left"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                  <span className="font-medium text-foreground">{formatTime(e.time)}–{formatTime(e.endTime)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-foreground truncate">{e.name}</span>
                  {e.type === "workshop" && e.price != null && e.price > 0 && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-medium text-foreground whitespace-nowrap">{e.price}€</span>
                    </>
                  )}
                  {e.type === "workshop" && e.spotsLeft != null && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className={`whitespace-nowrap ${e.spotsLeft <= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {e.spotsLeft} place{e.spotsLeft > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium ${style.block}`}>
                    {getCategoryLabel(e.category)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Month helpers ───

function getMonthBounds(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

function RecurringGrid({ courses, schedules, onEventClick }: {
  courses: Course[]; schedules: Schedule[];
  onEventClick?: PlanningTypeViewProps["onEventClick"];
}) {
  const rows = useMemo(() => {
    const schedulesByCourse: Record<string, { day: string; time: string; end_time: string; category: string }[]> = {};
    const courseMap = new Map(courses.map(c => [c.id, c]));
    for (const s of schedules) {
      const course = courseMap.get(s.course_id);
      if (!course) continue;
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = [];
      schedulesByCourse[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time, category: course.category });
    }
    return courses
      .map(c => ({ id: c.id, name: c.name, category: c.category, slots: schedulesByCourse[c.id] || [] }))
      .filter(r => r.slots.length > 0);
  }, [courses, schedules]);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[90px]">Cours</th>
            {DAYS_SHORT.map((d, i) => (
              <th key={`${d}-${i}`} className="py-2 px-1 font-medium text-muted-foreground text-center w-8">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(a => {
            const style = getCategoryStyle(a.category);
            return (
              <tr key={a.name} className="border-b border-muted/30 last:border-0">
                <td className="py-2.5 px-3">
                  <button
                    className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                    onClick={() => onEventClick?.({ type: "course", name: a.name, id: a.id })}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                    <span className="font-medium text-xs">{a.name}</span>
                  </button>
                </td>
                {DAYS.map(day => {
                  const daySlots = a.slots.filter(s => s.day === day);
                  return (
                    <td key={day} className="py-2.5 px-1 text-center">
                      {daySlots.length > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {daySlots.map((s, i) => (
                            <button
                              key={i}
                              className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] font-semibold text-white ${style.dot} hover:opacity-80 transition-opacity cursor-pointer`}
                              onClick={() => onEventClick?.({ type: "course", name: a.name, id: a.id })}
                            >
                              {formatTime(s.time)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/20">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MonthWorkshops({ workshops, onEventClick, hideTitle, hidePriceSpots }: {
  workshops: Workshop[];
  onEventClick?: PlanningTypeViewProps["onEventClick"];
  hideTitle?: boolean;
  hidePriceSpots?: boolean;
}) {
  const { start, end } = getMonthBounds();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const grouped = useMemo(() => {
    const filtered = workshops.filter(w => {
      const d = new Date(w.date + "T12:00:00");
      return d >= start && d <= end && d >= today;
    });

    const byCat: Record<string, Workshop[]> = {};
    for (const w of filtered) {
      if (!byCat[w.category]) byCat[w.category] = [];
      if (!byCat[w.category].some(e => e.name === w.name && e.date === w.date)) {
        byCat[w.category].push(w);
      }
    }

    return Object.entries(byCat).map(([cat, items]) => ({
      category: cat,
      items: items.sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, [workshops, start, end]);

  if (grouped.length === 0) return null;

  return (
    <div className="space-y-3">
      {!hideTitle && <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ateliers & stages</h4>}
      {grouped.map(({ category, items }) => {
        const style = getCategoryStyle(category);
        return (
          <div key={category} className="space-y-1">
            {items.map(w => (
              <button
                key={w.id}
                onClick={() => onEventClick?.({ type: "workshop", name: w.name, id: w.id, date: w.date })}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border text-xs hover:bg-muted/50 transition-colors cursor-pointer text-left"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <span className="font-medium text-foreground">{formatDateShort(w.date)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{formatTime(w.time)}–{formatTime(w.end_time)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-medium text-foreground truncate">{w.name}</span>
                {!hidePriceSpots && w.price > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium text-foreground whitespace-nowrap">{w.price}€</span>
                  </>
                )}
                {!hidePriceSpots && (
                  <span className={`ml-auto whitespace-nowrap ${w.spots_left <= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {w.spots_left} pl.
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MonthProgram({ courses, schedules, workshops, onEventClick }: {
  courses: Course[]; schedules: Schedule[]; workshops: Workshop[];
  onEventClick?: PlanningTypeViewProps["onEventClick"];
}) {
  const { label } = getMonthBounds();

  return (
    <div className="space-y-4">
      <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cours récurrents</h4>
        <RecurringGrid courses={courses} schedules={schedules} onEventClick={onEventClick} />
      </div>
      <MonthWorkshops workshops={workshops} onEventClick={onEventClick} />
    </div>
  );
}

// ─── Main component ───

const PlanningTypeView = forwardRef<PlanningTypeViewHandle, PlanningTypeViewProps>(
  function PlanningTypeView({ courses, schedules, workshops = [], filter, compact, onEventClick }, ref) {
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      openAndScroll: () => {
        setOpen(true);
        // Small delay so the DOM expands before scrolling
        setTimeout(() => {
          document.getElementById("programme-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      },
    }));

    const filteredCourses = useMemo(() => {
      if (!filter || filter === "all") return courses;
      return courses.filter(c => c.category === filter);
    }, [courses, filter]);

    const filteredSchedules = useMemo(() => {
      if (!filter || filter === "all") return schedules;
      const courseIds = new Set(filteredCourses.map(c => c.id));
      return schedules.filter(s => courseIds.has(s.course_id));
    }, [schedules, filteredCourses, filter]);

    const filteredWorkshops = useMemo(() => {
      if (!filter || filter === "all") return workshops;
      return workshops.filter(w => w.category === filter);
    }, [workshops, filter]);

    const hasContent = filteredCourses.length > 0 || filteredWorkshops.length > 0;
    if (!hasContent) return null;

    return (
      <section id="programme-section" className={compact ? "py-3 md:py-4" : "py-8 md:py-12"}>
        <div className="container max-w-3xl mx-auto">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-display font-bold text-primary-dark hover:text-primary transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            <span>Programme</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[1200px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
            <Tabs defaultValue="week">
              <TabsList className="w-full justify-center mb-3">
                <TabsTrigger value="week" className="text-xs">Cette semaine</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">Ce mois</TabsTrigger>
              </TabsList>
              <TabsContent value="week">
                <WeekProgram courses={filteredCourses} schedules={filteredSchedules} workshops={filteredWorkshops} onEventClick={onEventClick} />
              </TabsContent>
              <TabsContent value="month">
                <MonthProgram courses={filteredCourses} schedules={filteredSchedules} workshops={filteredWorkshops} onEventClick={onEventClick} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    );
  }
);

export default PlanningTypeView;
export { RecurringGrid, MonthWorkshops, formatTime, formatDateShort, getCategoryStyle, getMonthBounds };
