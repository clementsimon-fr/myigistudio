import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Workshop } from "@/hooks/useActivitiesData";

interface PotteryCalendarProps {
  workshops: Workshop[];
  onBook: (workshop: Workshop) => void;
}

const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PotteryCalendar({ workshops, onBook }: PotteryCalendarProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Filtered workshops
  const filtered = useMemo(() => {
    return workshops.filter(w => w.category === "poterie");
  }, [workshops]);

  // Map date → workshops for the current month
  const dateMap = useMemo(() => {
    const map: Record<string, Workshop[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const w of filtered) {
      const wd = new Date(w.date + "T12:00:00");
      if (wd < today) continue;
      if (wd.getMonth() !== monthDate.getMonth() || wd.getFullYear() !== monthDate.getFullYear()) continue;
      if (!map[w.date]) map[w.date] = [];
      // Dedupe by id
      if (!map[w.date].some(x => x.id === w.id)) map[w.date].push(w);
    }
    return map;
  }, [filtered, monthDate]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0
    let startIdx = firstDay.getDay() - 1;
    if (startIdx < 0) startIdx = 6;

    const days: (number | null)[] = [];
    for (let i = 0; i < startIdx; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
    // Fill remaining
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [monthDate]);

  const slotsForDate = selectedDate ? (dateMap[selectedDate] || []) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => { setMonthOffset(o => o - 1); setSelectedDate(null); }} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground capitalize min-w-[160px] text-center">
          {monthLabel}
        </h3>
        <button onClick={() => { setMonthOffset(o => o + 1); setSelectedDate(null); }} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="max-w-sm mx-auto">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_SHORT.map((d, i) => (
            <div key={`h-${i}`} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />;
            const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const ws = dateMap[dateStr];
            const hasSlots = ws && ws.length > 0;
            const allFull = hasSlots && ws.every(w => w.spots_left === 0);
            const isSelected = selectedDate === dateStr;
            const today = formatDateStr(new Date());
            const isPast = dateStr < today;

            return (
              <button
                key={`d-${idx}`}
                disabled={!hasSlots || isPast}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`aspect-square rounded-full flex items-center justify-center text-xs font-medium transition-all
                  ${!hasSlots || isPast ? "text-muted-foreground/30 cursor-default" : "cursor-pointer hover:scale-110"}
                  ${isSelected ? "ring-2 ring-offset-1 ring-[hsl(40,76%,60%)]" : ""}
                  ${hasSlots && !allFull && !isPast ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : ""}
                  ${hasSlots && allFull && !isPast ? "bg-red-100 text-red-600 border border-red-300" : ""}
                `}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" /> Disponible</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-300" /> Complet</div>
      </div>

      {/* Slots for selected date */}
      {selectedDate && (
        <div className="space-y-2 max-w-sm mx-auto">
          <h4 className="text-sm font-semibold text-center">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </h4>
          {slotsForDate.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Aucun créneau disponible</p>
          ) : (
            slotsForDate.map(w => (
              <button
                key={w.id}
                onClick={() => w.spots_left > 0 && onBook(w)}
                disabled={w.spots_left === 0}
                className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all
                  ${w.spots_left > 0 ? "hover:shadow-md hover:border-[hsl(40,76%,60%)] cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{w.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {w.time} - {w.end_time}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {w.spots_left > 0 ? `${w.spots_left} place${w.spots_left > 1 ? "s" : ""}` : "Complet"}</span>
                  </div>
                </div>
                {w.spots_left > 0 ? (
                  <Badge className="bg-[hsl(40,76%,60%)] text-white text-xs">Réserver</Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">Complet</Badge>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
