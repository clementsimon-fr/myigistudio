import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes", dot: "", activeBg: "" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
  { value: "bien-etre", label: "Ateliers", dot: "bg-[hsl(0,55%,58%)]", activeBg: "bg-[hsl(0,55%,58%)]" },
];

function getDayFromDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr + "T12:00:00");
    const map = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return map[d.getDay()] || null;
  } catch { return null; }
}

interface TimeSlot {
  day: string;
  time: string;
  end_time: string;
}

interface ActivityRow {
  name: string;
  category: string;
  slots: TimeSlot[];
}

export default function PlanningType() {
  const { courses, schedules, workshops, loading } = useActivitiesData();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"compiled" | "by-category">("by-category");
  const [showTimes, setShowTimes] = useState(true);

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
    if (categoryFilter === "all") return rows;
    return rows.filter(r => r.category === categoryFilter);
  }, [rows, categoryFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, ActivityRow[]> = {};
    for (const r of filtered) {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r);
    }
    return map;
  }, [filtered]);

  const categoryLabels: Record<string, string> = {
    yoga: "Yoga & Pilates",
    poterie: "Poterie",
    "bien-etre": "Ateliers & Stages",
  };

  const renderTimeCell = (activity: ActivityRow, day: string) => {
    const daySlots = activity.slots.filter(s => s.day === day);
    if (daySlots.length === 0) return <span className="text-muted-foreground/20">·</span>;

    const style = CATEGORY_STYLES[activity.category];
    const dotColor = style?.dot || "bg-primary";

    if (showTimes) {
      return (
        <div className="space-y-0.5">
          {daySlots.map((s, i) => (
            <div key={i} className={`text-[9px] sm:text-[10px] font-medium rounded px-0.5 py-0.5 text-white leading-tight ${dotColor}`}>
              {s.time}–{s.end_time}
            </div>
          ))}
        </div>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold text-white cursor-default ${dotColor}`}>
            ✕
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {daySlots.map((s, i) => (
            <div key={i}>{s.time} – {s.end_time}</div>
          ))}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <AdminLayout title="Planning type">
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Vue automatique de la semaine type, générée à partir de vos activités et créneaux.
          </p>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex gap-1.5">
              <Button size="sm" variant={viewMode === "by-category" ? "default" : "outline"} className="text-xs h-8" onClick={() => setViewMode("by-category")}>
                Par catégorie
              </Button>
              <Button size="sm" variant={viewMode === "compiled" ? "default" : "outline"} className="text-xs h-8" onClick={() => setViewMode("compiled")}>
                Vue compilée
              </Button>
            </div>
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
          </div>

          {viewMode === "by-category" ? (
            Object.entries(grouped).map(([category, activities]) => {
              const style = CATEGORY_STYLES[category];
              return (
                <div key={category} className="space-y-3">
                  <h2 className={`text-lg font-semibold ${style?.text || "text-foreground"}`}>
                    {categoryLabels[category] || category}
                  </h2>
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="w-full border-collapse text-sm min-w-[420px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2 sm:px-3 font-medium text-muted-foreground min-w-[100px]">Activité</th>
                          {DAYS_SHORT.map((d, i) => (
                            <th key={i} className={`py-2 px-1 sm:px-2 font-medium text-muted-foreground text-center ${showTimes ? "w-16 sm:w-20" : "w-10 sm:w-12"}`}>{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activities.map(a => (
                          <tr key={a.name} className="border-b border-muted/30 hover:bg-muted/20">
                            <td className="py-2.5 px-2 sm:px-3 font-medium text-xs sm:text-sm">{a.name}</td>
                            {DAYS.map(day => (
                              <td key={day} className="py-2.5 px-1 sm:px-2 text-center">
                                {renderTimeCell(a, day)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full border-collapse text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 sm:px-3 font-medium text-muted-foreground min-w-[100px]">Activité</th>
                    {DAYS_SHORT.map((d, i) => (
                      <th key={i} className={`py-2 px-1 sm:px-2 font-medium text-muted-foreground text-center ${showTimes ? "w-16 sm:w-20" : "w-10 sm:w-14"}`}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grouped).map(([category, activities]) => {
                    const style = CATEGORY_STYLES[category];
                    return activities.map((a, idx) => (
                      <tr key={a.name} className={`border-b border-muted/30 hover:bg-muted/20 ${idx === 0 ? "border-t-2" : ""}`}>
                        <td className="py-2.5 px-2 sm:px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${style?.dot || "bg-primary"}`} />
                            <span className={`font-medium text-xs sm:text-sm ${style?.text || ""}`}>{a.name}</span>
                          </div>
                        </td>
                        {DAYS.map(day => (
                          <td key={day} className="py-2.5 px-1 sm:px-2 text-center">
                            {renderTimeCell(a, day)}
                          </td>
                        ))}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-10">Aucune activité configurée.</p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
