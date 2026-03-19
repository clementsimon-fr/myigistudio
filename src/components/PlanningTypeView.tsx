import { useState, useMemo } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Schedule, Workshop } from "@/hooks/useActivitiesData";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

interface PlanningTypeViewProps {
  courses: Course[];
  schedules: Schedule[];
  workshops?: Workshop[];
  filter?: string;
  compact?: boolean;
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
  const day = now.getDay(); // 0=Sun
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
  price?: number;
  spotsLeft?: number;
}

function WeekProgram({ courses, schedules, workshops }: { courses: Course[]; schedules: Schedule[]; workshops: Workshop[] }) {
  const events = useMemo(() => {
    const { monday, sunday } = getWeekBounds();
    const result: WeekEvent[] = [];

    // Map course_schedules to real dates this week
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
      });
    }

    // Add workshops falling this week
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

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Aucun événement cette semaine.</p>;
  }

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, WeekEvent[]>();
    for (const e of events) {
      const key = e.dateStr;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [events]);

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
                <div key={`${dateStr}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border text-xs">
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
                </div>
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

/** Recurring courses grid — all categories */
function RecurringGrid({ courses, schedules }: { courses: Course[]; schedules: Schedule[] }) {
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
      .map(c => ({ name: c.name, category: c.category, slots: schedulesByCourse[c.id] || [] }))
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
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                    <span className="font-medium text-xs">{a.name}</span>
                  </div>
                </td>
                {DAYS.map(day => {
                  const daySlots = a.slots.filter(s => s.day === day);
                  return (
                    <td key={day} className="py-2.5 px-1 text-center">
                      {daySlots.length > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          {daySlots.map((s, i) => (
                            <span key={i} className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] font-semibold text-white ${style.dot}`}>
                              {formatTime(s.time)}
                            </span>
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

/** Monthly workshops list grouped by category */
function MonthWorkshops({ workshops }: { workshops: Workshop[] }) {
  const { start, end } = getMonthBounds();

  const grouped = useMemo(() => {
    const filtered = workshops.filter(w => {
      const d = new Date(w.date + "T12:00:00");
      return d >= start && d <= end;
    });

    const byCat: Record<string, Workshop[]> = {};
    for (const w of filtered) {
      if (!byCat[w.category]) byCat[w.category] = [];
      // Dedupe by name+date
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
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ateliers & stages</h4>
      {grouped.map(({ category, items }) => {
        const style = getCategoryStyle(category);
        return (
          <div key={category} className="space-y-1">
            {items.map(w => (
              <div key={w.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border text-xs">
                <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <span className="font-medium text-foreground">{formatDateShort(w.date)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{formatTime(w.time)}–{formatTime(w.end_time)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-medium text-foreground truncate">{w.name}</span>
                {w.price > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium text-foreground whitespace-nowrap">{w.price}€</span>
                  </>
                )}
                <span className={`ml-auto whitespace-nowrap ${w.spots_left <= 2 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {w.spots_left} pl.
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MonthProgram({ courses, schedules, workshops }: { courses: Course[]; schedules: Schedule[]; workshops: Workshop[] }) {
  const { label } = getMonthBounds();

  return (
    <div className="space-y-4">
      <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cours récurrents</h4>
        <RecurringGrid courses={courses} schedules={schedules} />
      </div>
      <MonthWorkshops workshops={workshops} />
    </div>
  );
}

// ─── Main component ───

export default function PlanningTypeView({ courses, schedules, workshops = [], filter, compact }: PlanningTypeViewProps) {
  const [open, setOpen] = useState(false);

  // Filter by category if needed
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
    <section className={compact ? "py-3 md:py-4" : "py-8 md:py-12"}>
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
              <WeekProgram courses={filteredCourses} schedules={filteredSchedules} workshops={filteredWorkshops} />
            </TabsContent>
            <TabsContent value="month">
              <MonthProgram courses={filteredCourses} schedules={filteredSchedules} workshops={filteredWorkshops} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
}
