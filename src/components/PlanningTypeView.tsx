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

function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T12:00:00") >= today;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(t: string): string {
  return t?.slice(0, 5).replace(":", "h") || "";
}

/** Yoga tab: weekly grid */
function YogaGrid({ courses, schedules }: { courses: Course[]; schedules: Schedule[] }) {
  const yogaCourses = useMemo(() => courses.filter(c => c.category === "yoga"), [courses]);
  const rows = useMemo(() => {
    const schedulesByCourse: Record<string, { day: string; time: string; end_time: string }[]> = {};
    for (const s of schedules) {
      if (!schedulesByCourse[s.course_id]) schedulesByCourse[s.course_id] = [];
      schedulesByCourse[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time });
    }
    return yogaCourses
      .map(c => ({ name: c.name, slots: schedulesByCourse[c.id] || [] }))
      .filter(r => r.slots.length > 0);
  }, [yogaCourses, schedules]);

  if (rows.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Aucun cours récurrent programmé.</p>;

  const style = CATEGORY_STYLES["yoga"];
  const dotColor = style?.dot || "bg-primary";

  return (
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
          {rows.map(a => (
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
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Workshop list tab (poterie / bien-etre) */
function WorkshopList({ workshops, category }: { workshops: Workshop[]; category: string }) {
  const filtered = useMemo(() => {
    const ws = workshops.filter(w => w.category === category && isFutureDate(w.date));
    // Group by name
    const byName: Record<string, Workshop[]> = {};
    for (const w of ws) {
      if (!byName[w.name]) byName[w.name] = [];
      if (!byName[w.name].some(e => e.date === w.date)) byName[w.name].push(w);
    }
    return Object.entries(byName).map(([name, items]) => ({
      name,
      sessions: items.sort((a, b) => a.date.localeCompare(b.date)),
    }));
  }, [workshops, category]);

  if (filtered.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">Aucun atelier programmé prochainement.</p>;

  const style = CATEGORY_STYLES[category];
  const dotColor = style?.dot || "bg-primary";

  return (
    <div className="space-y-3">
      {filtered.map(group => (
        <div key={group.name} className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
            <span className={`font-semibold text-sm ${style?.text || "text-foreground"}`}>{group.name}</span>
          </div>
          <div className="space-y-1 ml-4">
            {group.sessions.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{formatDateShort(s.date)}</span>
                <span>·</span>
                <span>{formatTime(s.time)}–{formatTime(s.end_time)}</span>
                {s.price > 0 && <><span>·</span><span className="font-medium text-foreground">{s.price}€</span></>}
                <span>·</span>
                <span className={s.spots_left <= 2 ? "text-destructive font-medium" : ""}>
                  {s.spots_left} place{s.spots_left > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlanningTypeView({ courses, schedules, workshops = [], filter, compact }: PlanningTypeViewProps) {
  const [open, setOpen] = useState(false);

  const hasYoga = useMemo(() => courses.some(c => c.category === "yoga"), [courses]);
  const hasPoterie = useMemo(() => workshops.some(w => w.category === "poterie" && isFutureDate(w.date)), [workshops]);
  const hasAteliers = useMemo(() => workshops.some(w => w.category === "bien-etre" && isFutureDate(w.date)), [workshops]);

  const availableTabs = useMemo(() => {
    const tabs: { value: string; label: string }[] = [];
    if (hasYoga) tabs.push({ value: "yoga", label: "Yoga" });
    if (hasPoterie) tabs.push({ value: "poterie", label: "Poterie" });
    if (hasAteliers) tabs.push({ value: "bien-etre", label: "Ateliers" });
    return tabs;
  }, [hasYoga, hasPoterie, hasAteliers]);

  // Apply filter
  const filteredTabs = useMemo(() => {
    if (!filter || filter === "all") return availableTabs;
    return availableTabs.filter(t => t.value === filter);
  }, [availableTabs, filter]);

  if (filteredTabs.length === 0) return null;

  const defaultTab = filteredTabs[0]?.value || "yoga";

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
        <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[800px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
          {filteredTabs.length === 1 ? (
            // Single tab: no tabs UI needed
            filteredTabs[0].value === "yoga" ? (
              <YogaGrid courses={courses} schedules={schedules} />
            ) : (
              <WorkshopList workshops={workshops} category={filteredTabs[0].value} />
            )
          ) : (
            <Tabs defaultValue={defaultTab}>
              <TabsList className="w-full justify-center mb-3">
                {filteredTabs.map(tab => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="yoga">
                <YogaGrid courses={courses} schedules={schedules} />
              </TabsContent>
              <TabsContent value="poterie">
                <WorkshopList workshops={workshops} category="poterie" />
              </TabsContent>
              <TabsContent value="bien-etre">
                <WorkshopList workshops={workshops} category="bien-etre" />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </section>
  );
}
