import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getDayFromDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const dayIndex = d.getDay(); // 0=Sun
    const map = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return map[dayIndex] || null;
  } catch { return null; }
}

interface ActivityRow {
  name: string;
  category: string;
  days: Set<string>;
  parentName?: string;
}

export default function PlanningType() {
  const { courses, schedules, workshops, loading } = useActivitiesData();

  const rows = useMemo(() => {
    const result: ActivityRow[] = [];

    // Group schedules by course
    const schedulesByCourse: Record<string, Set<string>> = {};
    for (const s of schedules) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = new Set();
      schedulesByCourse[s.course_id].add(s.day);
    }

    // Courses (yoga)
    for (const c of courses) {
      result.push({
        name: c.name,
        category: c.category,
        days: schedulesByCourse[c.id] || new Set(),
      });
    }

    // Workshops (recurring ones show their day)
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

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const r of rows) {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r);
    }
    return map;
  }, [rows]);

  const categoryLabels: Record<string, string> = {
    yoga: "Yoga & Pilates",
    poterie: "Poterie",
    "bien-etre": "Ateliers & Stages",
  };

  return (
    <AdminLayout title="Planning type">
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Vue automatique de la semaine type, générée à partir de vos activités et créneaux.
          </p>

          {Object.entries(grouped).map(([category, activities]) => {
            const style = CATEGORY_STYLES[category];
            const dotColor = style?.dot || "bg-primary";

            return (
              <div key={category} className="space-y-3">
                <h2 className={`text-lg font-semibold ${style?.text || "text-foreground"}`}>
                  {categoryLabels[category] || category}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[140px]">Activité</th>
                        {DAYS_SHORT.map(d => (
                          <th key={d} className="py-2 px-2 font-medium text-muted-foreground text-center w-12">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(a => (
                        <tr key={a.name} className="border-b border-muted/30 hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-medium">{a.name}</td>
                          {DAYS.map(day => (
                            <td key={day} className="py-2.5 px-2 text-center">
                              {a.days.has(day) ? (
                                <span className={`inline-block w-3 h-3 rounded-full ${dotColor}`} />
                              ) : (
                                <span className="text-muted-foreground/30">·</span>
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

          {rows.length === 0 && (
            <p className="text-center text-muted-foreground py-10">Aucune activité configurée.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
