import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, Users, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Reservation {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  date: string;
  time: string;
  end_time: string;
  participants: number;
  status: string;
  schedule_id: string | null;
  course_id: string | null;
  workshop_id: string | null;
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

interface Course {
  id: string;
  name: string;
  category: string;
  instructor: string;
}

interface Workshop {
  id: string;
  name: string;
  category: string;
  date: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface ActivityBlock {
  id: string;
  title: string;
  category: string;
  time: string;
  end_time: string;
  type: "course" | "workshop";
  spots: number;
  spotsLeft: number;
  instructor?: string;
  reservations: Reservation[];
}

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

const CATEGORY_COLORS: Record<string, string> = {
  yoga: "bg-primary/15 border-primary/30 text-primary-dark",
  poterie: "bg-secondary/30 border-secondary/50 text-secondary-foreground",
  "bien-etre": "bg-accent/20 border-accent/40 text-accent-foreground",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function DailyView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<ActivityBlock | null>(null);

  const dateStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    const d = String(currentDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentDate]);

  const dayName = DAY_NAMES[currentDate.getDay()];

  const fetchData = async () => {
    setLoading(true);
    const [resaRes, schedRes, courseRes, wsRes] = await Promise.all([
      supabase.from("reservations").select("*").eq("date", dateStr),
      supabase.from("course_schedules").select("*"),
      supabase.from("courses").select("id, name, category, instructor"),
      supabase.from("workshops").select("*"),
    ]);
    if (resaRes.data) setReservations(resaRes.data as unknown as Reservation[]);
    if (schedRes.data) setSchedules(schedRes.data as unknown as Schedule[]);
    if (courseRes.data) setCourses(courseRes.data as unknown as Course[]);
    if (wsRes.data) setWorkshops(wsRes.data as unknown as Workshop[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateStr]);

  const blocks: ActivityBlock[] = useMemo(() => {
    const result: ActivityBlock[] = [];

    // Recurring courses for this day of week
    const daySchedules = schedules.filter(s => s.day === dayName);
    for (const sched of daySchedules) {
      const course = courses.find(c => c.id === sched.course_id);
      if (!course) continue;
      const matchingResas = reservations.filter(
        r => r.schedule_id === sched.id && r.status === "confirmé"
      );
      result.push({
        id: sched.id,
        title: course.name,
        category: course.category,
        time: sched.time,
        end_time: sched.end_time,
        type: "course",
        spots: sched.spots,
        spotsLeft: sched.spots_left,
        instructor: course.instructor,
        reservations: matchingResas,
      });
    }

    // Workshops on this date
    const dayWorkshops = workshops.filter(w => w.date === dateStr);
    for (const ws of dayWorkshops) {
      const matchingResas = reservations.filter(
        r => r.workshop_id === ws.id && r.status === "confirmé"
      );
      result.push({
        id: ws.id,
        title: ws.name,
        category: ws.category,
        time: ws.time,
        end_time: ws.end_time,
        type: "workshop",
        spots: ws.spots,
        spotsLeft: ws.spots_left,
        reservations: matchingResas,
      });
    }

    result.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return result;
  }, [dayName, dateStr, schedules, courses, workshops, reservations]);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  const isToday = dateStr === new Date().toISOString().split("T")[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={prevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h3>
          {!isToday && (
            <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={goToday}>
              Aujourd'hui
            </Button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={nextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Activity blocks */}
      {blocks.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          Aucune activité programmée ce jour.
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => {
            const totalParticipants = block.reservations.reduce((sum, r) => sum + r.participants, 0);
            const colorClass = CATEGORY_COLORS[block.category] || "bg-muted border-border text-foreground";

            return (
              <div
                key={block.id}
                className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${colorClass}`}
                onClick={() => setSelectedBlock(block)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-base">{block.title}</h4>
                    <div className="flex items-center gap-3 text-sm opacity-80">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {block.time} - {block.end_time}
                      </span>
                      {block.instructor && (
                        <span>· {block.instructor}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="secondary" className="text-xs">
                      {block.type === "course" ? "Cours" : "Atelier"}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm justify-end">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium">{totalParticipants}/{block.spots}</span>
                    </div>
                  </div>
                </div>

                {/* Quick participant preview */}
                {block.reservations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <div className="flex flex-wrap gap-1.5">
                      {block.reservations.slice(0, 6).map(r => (
                        <Badge key={r.id} variant="outline" className="text-xs bg-background/60">
                          {r.client_name} {r.participants > 1 && `(×${r.participants})`}
                        </Badge>
                      ))}
                      {block.reservations.length > 6 && (
                        <Badge variant="outline" className="text-xs bg-background/60">
                          +{block.reservations.length - 6}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedBlock?.title}</DialogTitle>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedBlock.time} - {selectedBlock.end_time}</span>
                {selectedBlock.instructor && <span>· {selectedBlock.instructor}</span>}
              </div>

              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {selectedBlock.reservations.reduce((s, r) => s + r.participants, 0)} / {selectedBlock.spots} participants
                </span>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-3">Participants inscrits</h4>
                {selectedBlock.reservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun participant inscrit.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBlock.reservations.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary-dark" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.participants} personne{r.participants > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className="text-xs"
                          variant={r.status === "confirmé" ? "default" : "destructive"}
                        >
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
