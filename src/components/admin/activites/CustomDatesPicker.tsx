import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Users, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function CustomDatesPicker({ dates, onChange, time, endTime, spots, onTimeChange, onEndTimeChange, onSpotsChange }: {
  dates: string[]; onChange: (dates: string[]) => void;
  time: string; endTime: string; spots: number;
  onTimeChange: (v: string) => void; onEndTimeChange: (v: string) => void; onSpotsChange: (v: number) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const selectedDates = dates.map(d => new Date(d + "T12:00:00"));

  const toggleDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (dates.includes(dateStr)) {
      onChange(dates.filter(d => d !== dateStr));
    } else {
      onChange([...dates, dateStr].sort());
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Input type="time" className="w-[90px] h-8 text-xs" value={time} onChange={e => onTimeChange(e.target.value)} />
          <span className="text-muted-foreground text-xs">→</span>
          <Input type="time" className="w-[90px] h-8 text-xs" value={endTime} onChange={e => onEndTimeChange(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <Input type="number" className="w-[70px] h-8 text-xs" value={spots} onChange={e => onSpotsChange(Number(e.target.value))} />
        </div>
      </div>
      <Calendar
        mode="multiple"
        selected={selectedDates}
        onSelect={(_, selectedDay) => toggleDate(selectedDay)}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className={cn("p-3 pointer-events-auto border rounded-lg")}
        locale={fr}
      />
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dates.map(d => (
            <Badge key={d} variant="secondary" className="text-[10px] gap-1">
              {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              <button onClick={() => onChange(dates.filter(dd => dd !== d))} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
