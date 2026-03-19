import { useState, useMemo } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Schedule } from "@/hooks/useActivitiesData";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

interface TimeSlot { day: string; time: string; end_time: string; }
interface ActivityRow { name: string; category: string; slots: TimeSlot[]; }

interface PlanningTypeViewProps {
  courses: Course[];
  schedules: Schedule[];
  filter?: string;
  compact?: boolean;
}

export default function PlanningTypeView({ courses, schedules, filter, compact }: PlanningTypeViewProps) {
  // Only show yoga courses in the weekly rhythm (recurring activities)
  const yogaCourses = useMemo(() => courses.filter(c => c.category === "yoga"), [courses]);

  const rows = useMemo(() => {
    const result: ActivityRow[] = [];
    const schedulesByCourse: Record<string, TimeSlot[]> = {};
    for (const s of schedules) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = [];
      schedulesByCourse[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time });
    }
    for (const c of yogaCourses) {
      const slots = schedulesByCourse[c.id] || [];
      if (slots.length > 0) {
        result.push({ name: c.name, category: c.category, slots });
      }
    }
    return result;
  }, [yogaCourses, schedules]);

  const filtered = useMemo(() => {
    if (!filter || filter === "all") return rows;
    return rows.filter(r => r.category === filter);
  }, [rows, filter]);

  const grouped = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const r of filtered) {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r);
    }
    return Object.entries(map);
  }, [filtered]);

  const categoryLabels: Record<string, string> = {
    yoga: "Yoga & Pilates",
    poterie: "Poterie",
    "bien-etre": "Ateliers & Stages",
  };

  if (filtered.length === 0) return null;

  const [open, setOpen] = useState(false);

  return (
    <section className={compact ? "py-3 md:py-4" : "py-8 md:py-12"}>
      <div className="container max-w-3xl mx-auto">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-display font-bold text-primary-dark hover:text-primary transition-colors"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Rythme de la semaine</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
        <div className="space-y-4">
          {grouped.map(([category, activities]) => {
            const style = CATEGORY_STYLES[category];
            const dotColor = style?.dot || "bg-primary";
            return (
              <div key={category}>
                <h3 className={`text-sm font-semibold mb-2 ${style?.text || "text-foreground"}`}>
                  {categoryLabels[category] || category}
                </h3>
                <div className="overflow-x-auto rounded-lg border bg-card">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[90px]">Activité</th>
                        {DAYS_SHORT.map((d, i) => (
                          <th key={`${d}-${i}`} className="py-2 px-1 font-medium text-muted-foreground text-center w-8">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(a => (
                        <tr key={a.name} className="border-b border-muted/30 last:border-0">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
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
                                      <span key={i} className={`inline-flex items-center justify-center px-1 py-0.5 rounded text-[8px] font-semibold text-white ${dotColor}`}>
                                        {s.time}
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}
