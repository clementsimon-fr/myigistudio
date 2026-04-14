import { useState, useMemo } from "react";
import { Loader2, CalendarDays, RotateCcw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes", dot: "", activeBg: "" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
];

function formatTime(t: string): string {
  return t?.slice(0, 5).replace(":", "h") || "";
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

const categoryLabels: Record<string, string> = {
  yoga: "Yoga & Pilates",
  poterie: "Poterie",
};

export default function PlanningType() {
  const { courses, schedules, workshops, loading } = useActivitiesData();
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Categorize data
  const categorizedData = useMemo(() => {
    const categories = ["yoga", "poterie"];
    const result: Record<string, {
      recurring: { name: string; category: string; slots: { day: string; time: string; end_time: string }[] }[];
      ponctual: { name: string; category: string; date: string; time: string; end_time: string; id: string }[];
    }> = {};

    for (const cat of categories) {
      const schedulesByCourse: Record<string, { day: string; time: string; end_time: string }[]> = {};
      const catCourses = courses.filter(c => c.category === cat);
      for (const s of schedules) {
        const course = catCourses.find(c => c.id === s.course_id);
        if (!course) continue;
        if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = [];
        schedulesByCourse[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time });
      }

      const recurring = catCourses
        .map(c => ({ name: c.name, category: c.category, slots: schedulesByCourse[c.id] || [] }))
        .filter(r => r.slots.length > 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const catWorkshops = workshops.filter(w => w.category === cat);
      // Dedupe by name+date
      const seen = new Set<string>();
      const ponctual = catWorkshops
        .filter(w => {
          const key = `${w.name}-${w.date}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return new Date(w.date + "T12:00:00") >= today;
        })
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(w => ({ name: w.name, category: w.category, date: w.date, time: w.time, end_time: w.end_time, id: w.id }));

      result[cat] = { recurring, ponctual };
    }
    return result;
  }, [courses, schedules, workshops]);

  const visibleCategories = useMemo(() => {
    if (categoryFilter === "all") return ["yoga", "poterie"];
    return [categoryFilter];
  }, [categoryFilter]);

  return (
    <AdminLayout title="Planning type">
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Vue synthétique de votre rythme par activité : récurrent vs ponctuel.
          </p>

          <div className="flex gap-1.5 flex-wrap">
            {CATEGORY_FILTERS.map(f => {
              const isActive = categoryFilter === f.value;
              return (
                <Badge
                  key={f.value}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer text-xs gap-1 ${isActive && f.activeBg ? `${f.activeBg} text-white border-transparent hover:opacity-90` : ""}`}
                  onClick={() => setCategoryFilter(f.value)}
                >
                  {f.dot && <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : f.dot}`} />}
                  {f.label}
                </Badge>
              );
            })}
          </div>

          {visibleCategories.map(cat => {
            const data = categorizedData[cat];
            if (!data) return null;
            const style = CATEGORY_STYLES[cat];
            const hasRecurring = data.recurring.length > 0;
            const hasPonctual = data.ponctual.length > 0;
            if (!hasRecurring && !hasPonctual) return null;

            return (
              <div key={cat} className="space-y-4">
                <h2 className={`text-lg font-semibold ${style?.text || "text-foreground"}`}>
                  {categoryLabels[cat] || cat}
                </h2>

                {/* ── Recurring section ── */}
                {hasRecurring && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      <RotateCcw className="h-3.5 w-3.5" /> Récurrent (chaque semaine)
                    </div>
                    <div className="overflow-x-auto rounded-lg border bg-card">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground min-w-[100px]">Cours</th>
                            {DAYS_SHORT.map((d, i) => (
                              <th key={`${d}-${i}`} className="py-2 px-1 font-medium text-muted-foreground text-center w-16">{d}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.recurring.map(a => (
                            <tr key={a.name} className="border-b border-muted/30 last:border-0 hover:bg-muted/20">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${style?.dot || "bg-primary"}`} />
                                  <span className="font-medium text-xs">{a.name}</span>
                                </div>
                              </td>
                              {DAYS.map(day => {
                                const daySlots = a.slots.filter(s => s.day === day);
                                return (
                                  <td key={day} className="py-2.5 px-1 text-center">
                                    {daySlots.length > 0 ? (
                                      <div className="space-y-0.5">
                                        {daySlots.map((s, i) => (
                                          <div key={i} className={`text-[9px] font-medium rounded px-0.5 py-0.5 text-white leading-tight ${style?.dot || "bg-primary"}`}>
                                            {formatTime(s.time)}
                                          </div>
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
                )}

                {/* ── Ponctual section ── */}
                {hasPonctual && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                      <CalendarDays className="h-3.5 w-3.5" /> Événements ponctuels
                    </div>
                    <div className="space-y-1">
                      {data.ponctual.map((w, i) => (
                        <div
                          key={`${w.id}-${i}`}
                          className="flex items-center gap-3 px-3 py-2 rounded-md border bg-card text-sm"
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${style?.dot || "bg-primary"}`} />
                          <span className="font-medium text-foreground min-w-[110px]">{formatDateShort(w.date)}</span>
                          <span className="text-muted-foreground">{formatTime(w.time)}–{formatTime(w.end_time)}</span>
                          <span className="font-medium text-foreground truncate">{w.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasRecurring && !hasPonctual && (
                  <p className="text-sm text-muted-foreground py-4">Aucune activité configurée.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}