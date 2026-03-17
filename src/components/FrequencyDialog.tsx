import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

function getDayFromDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const map = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return map[d.getDay()] || null;
  } catch { return null; }
}

interface TimeSlot { day: string; time: string; end_time: string; }

interface FrequencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  workshops: Workshop[];
  schedules: Schedule[];
  highlightCategory?: string;
  specificActivity?: string;
  title?: string;
}

interface ActivityRow { name: string; category: string; slots: TimeSlot[]; }

export default function FrequencyDialog({ open, onOpenChange, courses, workshops, schedules, highlightCategory, specificActivity, title }: FrequencyDialogProps) {
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
    if (specificActivity) return rows.filter(r => r.name === specificActivity);
    if (highlightCategory) return rows.filter(r => r.category === highlightCategory);
    return rows;
  }, [rows, specificActivity, highlightCategory]);

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

  const dialogTitle = title || (specificActivity ? `Planning – ${specificActivity}` : "Semaine type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {grouped.map(([category, activities]) => {
            const style = CATEGORY_STYLES[category];
            const dotColor = style?.dot || "bg-primary";
            return (
              <div key={category}>
                {!specificActivity && (
                  <h3 className={`text-sm font-semibold mb-2 ${style?.text || "text-foreground"}`}>
                    {categoryLabels[category] || category}
                  </h3>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground min-w-[80px]">Activité</th>
                        {DAYS_SHORT.map((d, i) => (
                          <th key={`${d}-${i}`} className="py-1.5 px-0.5 font-medium text-muted-foreground text-center w-8">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(a => (
                        <tr key={a.name} className="border-b border-muted/30">
                          <td className="py-2 px-2 font-medium text-xs">{a.name}</td>
                          {DAYS.map(day => {
                            const daySlots = a.slots.filter(s => s.day === day);
                            return (
                              <td key={day} className="py-2 px-0.5 text-center">
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
      </DialogContent>
    </Dialog>
  );
}
