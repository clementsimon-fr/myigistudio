import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface FrequencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  workshops: Workshop[];
  schedules: Schedule[];
  highlightCategory?: string;
}

interface ActivityRow {
  name: string;
  category: string;
  days: Set<string>;
}

export default function FrequencyDialog({ open, onOpenChange, courses, workshops, schedules, highlightCategory }: FrequencyDialogProps) {
  const rows = useMemo(() => {
    const result: ActivityRow[] = [];
    const schedulesByCourse: Record<string, Set<string>> = {};
    for (const s of schedules) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = new Set();
      schedulesByCourse[s.course_id].add(s.day);
    }
    for (const c of courses) {
      result.push({ name: c.name, category: c.category, days: schedulesByCourse[c.id] || new Set() });
    }
    for (const w of workshops) {
      const days = new Set<string>();
      if (w.frequency === "hebdomadaire" && w.date) {
        const day = getDayFromDate(w.date);
        if (day) days.add(day);
      }
      result.push({ name: w.name, category: w.category, days });
    }
    return result;
  }, [courses, schedules, workshops]);

  // Group by category, show highlighted category first
  const grouped = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const r of rows) {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r);
    }
    const entries = Object.entries(map);
    if (highlightCategory) {
      entries.sort(([a], [b]) => {
        if (a === highlightCategory) return -1;
        if (b === highlightCategory) return 1;
        return 0;
      });
    }
    return entries;
  }, [rows, highlightCategory]);

  const categoryLabels: Record<string, string> = {
    yoga: "Yoga & Pilates",
    poterie: "Poterie",
    "bien-etre": "Ateliers & Stages",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Semaine type</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {grouped.map(([category, activities]) => {
            const style = CATEGORY_STYLES[category];
            const dotColor = style?.dot || "bg-primary";
            return (
              <div key={category}>
                <h3 className={`text-sm font-semibold mb-2 ${style?.text || "text-foreground"}`}>
                  {categoryLabels[category] || category}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-2 font-medium text-muted-foreground min-w-[100px]">Activité</th>
                        {DAYS_SHORT.map(d => (
                          <th key={d} className="py-1.5 px-1 font-medium text-muted-foreground text-center w-9">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(a => (
                        <tr key={a.name} className="border-b border-muted/30">
                          <td className="py-2 px-2 font-medium">{a.name}</td>
                          {DAYS.map(day => (
                            <td key={day} className="py-2 px-1 text-center">
                              {a.days.has(day) ? (
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${dotColor}`}>✕</span>
                              ) : (
                                <span className="text-muted-foreground/20">·</span>
                              )}
                            </td>
                          ))}
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
