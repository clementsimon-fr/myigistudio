import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Clock, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CourseScheduleRow {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface AvailableSlot {
  id: string;
  name: string;
  time: string;
  end_time: string;
  duration: string;
  instructor: string;
  spots: number;
  spotsLeft: number;
  type: "course" | "workshop";
  sourceId: string;
  scheduleId?: string;
}

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

const DAY_NAMES_MAP: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

export default function Reserver() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const activityType = searchParams.get("type") as "course" | "workshop" | null;
  const activityId = searchParams.get("id");
  const preselectedDate = searchParams.get("date");
  const preselectedScheduleId = searchParams.get("scheduleId");

  const [activity, setActivity] = useState<any>(null);
  const [schedules, setSchedules] = useState<CourseScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [directBooking, setDirectBooking] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [participants, setParticipants] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activityType || !activityId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      if (activityType === "course") {
        const [courseRes, schedRes] = await Promise.all([
          supabase.from("courses").select("*").eq("id", activityId).single(),
          supabase.from("course_schedules").select("*").eq("course_id", activityId),
        ]);
        if (courseRes.data) setActivity({ ...courseRes.data, type: "course" });
        if (schedRes.data) {
          const scheds = schedRes.data as unknown as CourseScheduleRow[];
          setSchedules(scheds);
          // Direct booking: pre-select date and slot
          if (preselectedDate && preselectedScheduleId) {
            const d = new Date(preselectedDate + "T00:00:00");
            setSelectedDate(d);
            setSelectedSlot(preselectedScheduleId);
            setDirectBooking(true);
          }
        }
      } else {
        const res = await supabase.from("workshops").select("*").eq("id", activityId).single();
        if (res.data) {
          setActivity({ ...res.data, type: "workshop" });
          if (preselectedDate) {
            const d = new Date(preselectedDate + "T00:00:00");
            setSelectedDate(d);
            setSelectedSlot(res.data.id);
            setDirectBooking(true);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [activityType, activityId, preselectedDate, preselectedScheduleId]);

  // Available days for courses
  const availableDays = useMemo(() => {
    if (!activity || activity.type !== "course") return new Set<string>();
    return new Set(schedules.filter(s => s.spots_left > 0).map(s => s.day));
  }, [activity, schedules]);

  // Workshop dates
  const workshopDates = useMemo(() => {
    if (!activity || activity.type !== "workshop") return new Set<string>();
    const today = new Date().toISOString().split("T")[0];
    if (activity.date < today || activity.spots_left <= 0) return new Set<string>();
    return new Set([activity.date]);
  }, [activity]);

  const isDateDisabled = (date: Date) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (!activity) return true;
    if (activity.type === "course") return !availableDays.has(DAY_NAMES_MAP[date.getDay()]);
    if (activity.type === "workshop") return !workshopDates.has(date.toISOString().split("T")[0]);
    return true;
  };

  const slots: AvailableSlot[] = useMemo(() => {
    if (!selectedDate || !activity) return [];
    if (activity.type === "course") {
      const dayName = DAY_NAMES_MAP[selectedDate.getDay()];
      return schedules
        .filter(s => s.day === dayName)
        .map(s => ({
          id: s.id, name: activity.name, time: s.time, end_time: s.end_time,
          duration: calcDuration(s.time, s.end_time), instructor: activity.instructor || "Élodie",
          spots: s.spots, spotsLeft: s.spots_left, type: "course" as const,
          sourceId: activity.id, scheduleId: s.id,
        }));
    }
    if (activity.type === "workshop") {
      const dateStr = selectedDate.toISOString().split("T")[0];
      if (activity.date === dateStr) {
        return [{
          id: activity.id, name: activity.name, time: activity.time,
          end_time: activity.end_time || "", duration: calcDuration(activity.time, activity.end_time || "") || activity.duration,
          instructor: "Élodie", spots: activity.spots, spotsLeft: activity.spots_left,
          type: "workshop" as const, sourceId: activity.id,
        }];
      }
    }
    return [];
  }, [selectedDate, activity, schedules]);

  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  const handleConfirm = async () => {
    if (!selectedSlotData || !selectedDate) return;
    setSubmitting(true);
    const dateStr = selectedDate.toISOString().split("T")[0];
    const { error } = await supabase.from("reservations").insert({
      client_name: "Sophie",
      activity_name: selectedSlotData.name,
      activity_type: selectedSlotData.type,
      course_id: selectedSlotData.type === "course" ? selectedSlotData.sourceId : null,
      workshop_id: selectedSlotData.type === "workshop" ? selectedSlotData.sourceId : null,
      schedule_id: selectedSlotData.scheduleId || null,
      date: dateStr,
      time: selectedSlotData.time,
      end_time: selectedSlotData.end_time,
      participants,
      status: "confirmé",
    } as any);

    if (error) {
      toast({ title: "Erreur lors de la réservation", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Update spots
    if (selectedSlotData.scheduleId) {
      await supabase.from("course_schedules").update({ spots_left: selectedSlotData.spotsLeft - participants }).eq("id", selectedSlotData.scheduleId);
    } else if (selectedSlotData.type === "workshop") {
      await supabase.from("workshops").update({ spots_left: selectedSlotData.spotsLeft - participants }).eq("id", selectedSlotData.sourceId);
    }

    // Decrement credit from oldest active card
    const { data: activeCards } = await supabase
      .from("client_cards")
      .select("*")
      .eq("client_name", "Sophie")
      .gte("expires_at", new Date().toISOString().split("T")[0])
      .order("expires_at", { ascending: true });

    if (activeCards && activeCards.length > 0) {
      const card = (activeCards as any[]).find(c => c.used_sessions < c.total_sessions);
      if (card) {
        await supabase.from("client_cards").update({ used_sessions: card.used_sessions + 1 } as any).eq("id", card.id);
      }
    }

    setSubmitting(false);
    setConfirmed(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
        <Footer />
      </div>
    );
  }

  // No activity selected — redirect-like message
  if (!activityType || !activityId || !activity) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réserver une activité</h1>
            <p className="text-muted-foreground mb-6">
              Choisissez une activité depuis notre planning ou nos pages de cours pour commencer votre réservation.
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/calendrier"><Button>Voir le planning</Button></Link>
              <Link to="/yoga"><Button variant="outline">Yoga & Pilates</Button></Link>
              <Link to="/poterie"><Button variant="outline">Poterie</Button></Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-primary-dark" />
            </div>
            <h1 className="text-2xl font-display font-bold text-primary-dark mb-3">Réservation confirmée !</h1>
            <p className="text-muted-foreground mb-2">
              <strong>{selectedSlotData?.name}</strong> pour <strong>Sophie</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {selectedSlotData?.time}
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/mon-espace"><Button>Mes réservations</Button></Link>
              <Link to="/calendrier"><Button variant="outline">Retour au planning</Button></Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" className="mb-2 gap-1.5" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark">
              Réserver : {activity.name}
            </h1>
            {activity.description && (
              <p className="text-muted-foreground mt-1 text-sm">{activity.description}</p>
            )}
          </div>

          <div className={`grid ${directBooking ? "" : "md:grid-cols-2"} gap-6`}>
            {/* Calendar - hidden in direct booking mode */}
            {!directBooking && (
            <div>
              <h2 className="text-sm font-semibold text-primary-dark mb-3">Choisissez une date</h2>
              <div className="rounded-xl border bg-card p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedSlot(""); }}
                  locale={fr}
                  disabled={isDateDisabled}
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
              {activity.type === "course" && availableDays.size > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Disponible : {Array.from(availableDays).join(", ")}
                </p>
              )}
            </div>

            {/* Slot + participants + confirm */}
            <div className="space-y-4">
              {selectedDate ? (
                <>
                  <h2 className="text-sm font-semibold text-primary-dark">
                    {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </h2>

                  {slots.length > 0 ? (
                    <div className="space-y-2">
                      {slots.map(slot => (
                        <div
                          key={slot.id}
                          onClick={() => slot.spotsLeft > 0 && setSelectedSlot(slot.id)}
                          className={cn(
                            "rounded-lg border p-3 cursor-pointer transition-all",
                            selectedSlot === slot.id ? "border-primary-dark ring-2 ring-primary-dark/20 bg-primary/5" : "hover:border-primary-dark/50",
                            slot.spotsLeft === 0 && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{slot.time}{slot.end_time ? ` - ${slot.end_time}` : ""}</span>
                            <span className="text-muted-foreground">· {slot.duration}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {slot.spotsLeft === 0 ? (
                              <span className="text-destructive font-medium">Complet</span>
                            ) : (
                              <span>{slot.spotsLeft}/{slot.spots} places</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">Aucun créneau disponible.</p>
                  )}

                  {selectedSlotData && (
                    <div className="space-y-4 pt-2">
                      {/* Participants */}
                      <div>
                        <Label className="text-sm">Participants</Label>
                        <div className="flex items-center gap-3 mt-1">
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setParticipants(Math.max(1, participants - 1))}>-</Button>
                          <Input
                            type="number" min={1} max={selectedSlotData.spotsLeft}
                            value={participants}
                            onChange={(e) => setParticipants(Math.min(Number(e.target.value), selectedSlotData.spotsLeft))}
                            className="w-16 text-center h-8"
                          />
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setParticipants(Math.min(selectedSlotData.spotsLeft, participants + 1))}>+</Button>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Activité</span>
                          <span className="font-medium">{selectedSlotData.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">{selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Horaire</span>
                          <span className="font-medium">{selectedSlotData.time} - {selectedSlotData.end_time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Participants</span>
                          <span className="font-medium">{participants}</span>
                        </div>
                      </div>

                      <Button
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="w-full bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-1.5"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Confirmer la réservation
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Sélectionnez une date pour voir les créneaux disponibles.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
