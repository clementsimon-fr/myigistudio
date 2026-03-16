import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getDayFromDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const map = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return map[d.getDay()] || null;
  } catch { return null; }
}

interface TimeSlot { day: string; time: string; end_time: string; }
interface ActivityRow { name: string; category: string; slots: TimeSlot[]; }

interface PlanningTypeViewProps {
  courses: Course[];
  workshops: Workshop[];
  schedules: Schedule[];
  filter?: string;
}

export default function PlanningTypeView({ courses, workshops, schedules, filter }: PlanningTypeViewProps) {
  const rows = useMemo(() => {
    const result: ActivityRow[] = [];
    const schedulesByCourse: Record<string, TimeSlot[]> = {};
    for (const s of schedules) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = [];
      schedulesByCourse[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time });
    }
    for (const c of courses) {
      result.push({ name: c.name, category: c.category, slots: schedulesByCourse[c.id] || [] });
    }
    for (const w of workshops) {
      const slots: TimeSlot[] = [];
      if (w.date) {
        const day = getDayFromDate(w.date);
        if (day) slots.push({ day, time: w.time, end_time: w.end_time });
      }
      result.push({ name: w.name, category: w.category, slots });
    }
    return result;
  }, [courses, schedules, workshops]);

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

  if (filtered.length === 0) {
    return <p className="text-center text-muted-foreground py-10">Aucune activité configurée.</p>;
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <h2 className="text-xl md:text-2xl font-display font-bold text-primary-dark mb-6 text-center">
          Semaine type
        </h2>
        <div className="space-y-6 max-w-4xl mx-auto">
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
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[120px]">Activité</th>
                        {DAYS_SHORT.map(d => (
                          <th key={d} className="py-2 px-1.5 font-medium text-muted-foreground text-center w-10">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(a => (
                        <tr key={a.name} className="border-b border-muted/30 last:border-0">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                              <span className="font-medium text-sm">{a.name}</span>
                            </div>
                          </td>
                          {DAYS.map(day => {
                            const daySlots = a.slots.filter(s => s.day === day);
                            return (
                              <td key={day} className="py-2.5 px-1.5 text-center">
                                {daySlots.length > 0 ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold text-white cursor-default ${dotColor}`}>✕</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {daySlots.map((s, i) => (
                                        <div key={i}>{s.time} – {s.end_time}</div>
                                      ))}
                                    </TooltipContent>
                                  </Tooltip>
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
    </section>
  );
}
