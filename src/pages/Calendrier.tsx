import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, Users, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string;
  category: string;
  instructor: string;
  spots: number;
}

interface Schedule {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface Workshop {
  id: string;
  name: string;
  description: string;
  category: string;
  date: string;
  time: string;
  end_time: string;
  duration: string;
  price: number;
  spots: number;
  spots_left: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  time: string;
  end_time: string;
  type: "course" | "workshop";
  instructor: string;
  spots: number;
  spotsLeft: number;
  sourceId: string;
  scheduleId?: string;
  price?: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const DAY_MAP: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes" },
  { value: "yoga", label: "Yoga & Pilates" },
  { value: "poterie", label: "Poterie" },
  { value: "bien-etre", label: "Bien-être" },
];

const CATEGORY_COLORS: Record<string, string> = {
  yoga: "bg-primary/15 text-primary-dark border-primary/20",
  poterie: "bg-secondary/30 text-secondary-foreground border-secondary/40",
  "bien-etre": "bg-accent/20 text-accent-foreground border-accent/30",
};

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return "";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: CalendarDay[] = [];
  let jsDay = firstDay.getDay();
  let startOffset = jsDay === 0 ? 6 : jsDay - 1;
  for (let i = -startOffset; i <= lastDay.getDate() + 6; i++) {
    const d = new Date(year, month, i + 1);
    if (days.length >= 42) break;
    days.push({ date: d, isCurrentMonth: d.getMonth() === month, isToday: d.getTime() === today.getTime(), events: [] });
  }
  while (days.length % 7 !== 0 && days.length < 42) {
    const last = days[days.length - 1].date;
    const d = new Date(last); d.setDate(d.getDate() + 1);
    days.push({ date: d, isCurrentMonth: false, isToday: false, events: [] });
  }
  return days;
}

export default function Calendrier() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [c, s, w] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("course_schedules").select("*"),
        supabase.from("workshops").select("*"),
      ]);
      if (c.data) setCourses(c.data as unknown as Course[]);
      if (s.data) setSchedules(s.data as unknown as Schedule[]);
      if (w.data) setWorkshops(w.data as unknown as Workshop[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const calendarDays = useMemo(() => {
    const days = getMonthDays(year, month);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    for (const day of days) {
      if (day.date < today) continue;
      const dayName = DAY_MAP[day.date.getDay()];

      // Recurring courses
      for (const sched of schedules) {
        if (sched.day !== dayName) continue;
        const course = courses.find(c => c.id === sched.course_id);
        if (!course) continue;
        if (filter !== "all" && course.category !== filter) continue;
        day.events.push({
          id: `${sched.id}-${day.date.toISOString()}`,
          title: course.name,
          description: course.description || "",
          category: course.category,
          time: sched.time,
          end_time: sched.end_time,
          type: "course",
          instructor: course.instructor || "Élodie",
          spots: sched.spots,
          spotsLeft: sched.spots_left,
          sourceId: course.id,
          scheduleId: sched.id,
        });
      }

      // Workshops
      const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
      for (const ws of workshops) {
        if (ws.date !== dateStr) continue;
        if (filter !== "all" && ws.category !== filter) continue;
        day.events.push({
          id: ws.id,
          title: ws.name,
          description: ws.description || "",
          category: ws.category,
          time: ws.time,
          end_time: ws.end_time,
          type: "workshop",
          instructor: "Élodie",
          spots: ws.spots,
          spotsLeft: ws.spots_left,
          sourceId: ws.id,
          price: ws.price,
        });
      }

      day.events.sort((a, b) => a.time.localeCompare(b.time));
    }

    return days;
  }, [year, month, courses, schedules, workshops, filter]);

  const handleBook = (event: CalendarEvent) => {
    // Navigate to reservation page with pre-selection
    const categoryMap: Record<string, string> = { yoga: "yoga", poterie: "poterie", "bien-etre": "ateliers" };
    const service = categoryMap[event.category] || "yoga";
    navigate(`/reserver?service=${service}&activity=${event.sourceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-dark mb-2">Planning des activités</h1>
            <p className="text-muted-foreground">Retrouvez toutes nos activités et réservez en un clic</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {CATEGORY_FILTERS.map(f => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold capitalize">{MONTH_NAMES[month]} {year}</h3>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {DAY_NAMES.map(d => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  className={`min-h-[90px] md:min-h-[110px] border-b border-r p-1.5 transition-colors ${
                    !day.isCurrentMonth ? "bg-muted/5 text-muted-foreground/40" : ""
                  } ${day.isToday ? "bg-accent/10" : ""}`}
                >
                  <div className={`text-xs font-medium mb-1 ${day.isToday ? "text-primary font-bold" : ""}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {day.events.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate cursor-pointer border transition-all hover:shadow-sm ${
                          CATEGORY_COLORS[ev.category] || "bg-muted text-foreground border-border"
                        } ${ev.spotsLeft === 0 ? "opacity-50" : ""}`}
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <span className="font-medium">{ev.time}</span> {ev.title}
                      </div>
                    ))}
                    {day.events.length > 3 && (
                      <div className="text-[10px] text-muted-foreground pl-1">+{day.events.length - 3}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/15 border border-primary/20" /> Yoga & Pilates
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-secondary/30 border border-secondary/40" /> Poterie
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-accent/20 border border-accent/30" /> Bien-être
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">{selectedEvent.category}</Badge>
                  <Badge variant="secondary" className="text-xs">{selectedEvent.type === "course" ? "Cours" : "Atelier"}</Badge>
                </div>
                <DialogTitle className="font-display text-xl mt-2">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.time} - {selectedEvent.end_time} · {calcDuration(selectedEvent.time, selectedEvent.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedEvent.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {selectedEvent.spotsLeft === 0 ? (
                      <span className="text-destructive font-medium">Complet</span>
                    ) : (
                      <span>{selectedEvent.spotsLeft} place{selectedEvent.spotsLeft > 1 ? "s" : ""} disponible{selectedEvent.spotsLeft > 1 ? "s" : ""}</span>
                    )}
                  </div>
                  {selectedEvent.price !== undefined && selectedEvent.price > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary-dark">{selectedEvent.price}€</span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full gap-1.5"
                  disabled={selectedEvent.spotsLeft === 0}
                  onClick={() => {
                    setSelectedEvent(null);
                    handleBook(selectedEvent);
                  }}
                >
                  {selectedEvent.spotsLeft === 0 ? "Complet" : (
                    <>Réserver <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
