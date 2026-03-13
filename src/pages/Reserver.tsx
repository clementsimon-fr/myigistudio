import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Check, Clock, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { services } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const steps = [
  { num: 1, label: "Prestation" },
  { num: 2, label: "Activité" },
  { num: 3, label: "Date & Créneau" },
  { num: 4, label: "Participants" },
  { num: 5, label: "Confirmation" },
];

interface SubActivity {
  id: string;
  name: string;
  description: string;
  type: "course" | "workshop";
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

interface CourseScheduleRow {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
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
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedSubActivity, setSelectedSubActivity] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState("");
  const [participants, setParticipants] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [courses, setCourses] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<CourseScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const [c, w, s] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("workshops").select("*"),
      supabase.from("course_schedules").select("*"),
    ]);
    if (c.data) setCourses(c.data);
    if (w.data) setWorkshops(w.data);
    if (s.data) setSchedules(s.data as unknown as CourseScheduleRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const subActivities: SubActivity[] = useMemo(() => {
    if (selectedService === "yoga") {
      return courses
        .filter(c => c.category === "yoga")
        .map(c => ({ id: c.id, name: c.name, description: c.description || "", type: "course" as const }));
    }
    if (selectedService === "poterie") {
      return workshops
        .filter(w => w.category === "poterie")
        .map(w => ({ id: w.id, name: w.name, description: w.description || "", type: "workshop" as const }));
    }
    if (selectedService === "ateliers") {
      return workshops
        .filter(w => w.category === "bien-etre")
        .map(w => ({ id: w.id, name: w.name, description: w.description || "", type: "workshop" as const }));
    }
    return [];
  }, [selectedService, courses, workshops]);

  const selectedSubData = subActivities.find(s => s.id === selectedSubActivity);

  const availableDays = useMemo(() => {
    if (!selectedSubData || selectedSubData.type !== "course") return new Set<string>();
    return new Set(
      schedules
        .filter(s => s.course_id === selectedSubData.id && s.spots_left > 0)
        .map(s => s.day)
    );
  }, [selectedSubData, schedules]);

  const workshopDates = useMemo(() => {
    if (!selectedSubData || selectedSubData.type !== "workshop") return new Set<string>();
    const w = workshops.find(w => w.id === selectedSubData.id);
    if (!w || w.spots_left <= 0) return new Set<string>();
    const today = new Date().toISOString().split("T")[0];
    if (w.date < today) return new Set<string>();
    return new Set([w.date]);
  }, [selectedSubData, workshops]);

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    if (!selectedSubData) return true;
    if (selectedSubData.type === "course") {
      const dayName = DAY_NAMES_MAP[date.getDay()];
      return !availableDays.has(dayName);
    }
    if (selectedSubData.type === "workshop") {
      const dateStr = date.toISOString().split("T")[0];
      return !workshopDates.has(dateStr);
    }
    return true;
  };

  const slots: AvailableSlot[] = useMemo(() => {
    if (!selectedDate || !selectedSubData) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) return [];

    if (selectedSubData.type === "course") {
      const dayName = DAY_NAMES_MAP[selectedDate.getDay()];
      const course = courses.find(c => c.id === selectedSubData.id);
      if (!course) return [];
      return schedules
        .filter(s => s.course_id === selectedSubData.id && s.day === dayName)
        .map(s => ({
          id: s.id,
          name: course.name,
          time: s.time,
          end_time: s.end_time,
          duration: calcDuration(s.time, s.end_time),
          instructor: course.instructor || "Élodie",
          spots: s.spots,
          spotsLeft: s.spots_left,
          type: "course" as const,
          sourceId: course.id,
          scheduleId: s.id,
        }));
    }

    if (selectedSubData.type === "workshop") {
      const w = workshops.find(w => w.id === selectedSubData.id);
      if (!w) return [];
      const dateStr = selectedDate.toISOString().split("T")[0];
      if (w.date === dateStr) {
        return [{
          id: w.id,
          name: w.name,
          time: w.time,
          end_time: w.end_time || "",
          duration: calcDuration(w.time, w.end_time || "") || w.duration,
          instructor: "Élodie",
          spots: w.spots,
          spotsLeft: w.spots_left,
          type: "workshop" as const,
          sourceId: w.id,
        }];
      }
    }
    return [];
  }, [selectedDate, selectedSubData, courses, schedules, workshops]);

  const selectedSlotData = slots.find(s => s.id === selectedSlot);

  const handleConfirm = async () => {
    if (!selectedSlotData || !selectedDate) return;
    setSubmitting(true);

    const dateStr = selectedDate.toISOString().split("T")[0];

    // Create reservation
    const resPayload = {
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
    };

    const { error } = await supabase.from("reservations").insert(resPayload as any);

    if (error) {
      toast({ title: "Erreur lors de la réservation", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Decrement spots on the schedule slot or workshop
    if (selectedSlotData.scheduleId) {
      await supabase.from("course_schedules")
        .update({ spots_left: selectedSlotData.spotsLeft - participants })
        .eq("id", selectedSlotData.scheduleId);
    } else if (selectedSlotData.type === "workshop") {
      await supabase.from("workshops")
        .update({ spots_left: selectedSlotData.spotsLeft - participants })
        .eq("id", selectedSlotData.sourceId);
    }

    setSubmitting(false);
    setConfirmed(true);
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
              Votre réservation pour <strong>{selectedSlotData?.name}</strong> a été enregistrée pour <strong>Sophie</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {selectedSlotData?.time}
            </p>
            <div className="flex gap-3 justify-center">
              <Link to="/mon-espace">
                <Button>Voir mes réservations</Button>
              </Link>
              <Link to="/">
                <Button variant="outline">Retour à l'accueil</Button>
              </Link>
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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark">Réserver</h1>
            <Badge variant="outline" className="text-sm">Client : Sophie</Badge>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    step === s.num
                      ? "bg-primary-dark text-primary-dark-foreground"
                      : step > s.num
                        ? "bg-primary/20 text-primary-dark"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs">
                    {step > s.num ? <Check className="h-3 w-3" /> : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary-dark">Choisissez une prestation</h2>
              <RadioGroup value={selectedService} onValueChange={(v) => { setSelectedService(v); setSelectedSubActivity(""); setSelectedDate(undefined); setSelectedSlot(""); }}>
                {services.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 rounded-lg border bg-card p-4 cursor-pointer hover:border-primary-dark transition-colors">
                    <RadioGroupItem value={s.id} id={s.id} />
                    <Label htmlFor={s.id} className="flex-1 cursor-pointer">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!selectedService} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-primary-dark">Choisissez votre activité</h2>
              {subActivities.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">Aucune activité disponible dans cette catégorie.</p>
              ) : (
                <RadioGroup value={selectedSubActivity} onValueChange={(v) => { setSelectedSubActivity(v); setSelectedDate(undefined); setSelectedSlot(""); }}>
                  {subActivities.map((sa) => (
                    <div key={sa.id} className="flex items-center gap-4 rounded-lg border bg-card p-4 cursor-pointer hover:border-primary-dark transition-colors">
                      <RadioGroupItem value={sa.id} id={`sub-${sa.id}`} />
                      <Label htmlFor={`sub-${sa.id}`} className="flex-1 cursor-pointer">
                        <p className="font-medium">{sa.name}</p>
                        {sa.description && <p className="text-sm text-muted-foreground line-clamp-2">{sa.description}</p>}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(3)} disabled={!selectedSubActivity} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary-dark">
                Choisissez une date pour <span className="text-primary">{selectedSubData?.name}</span>
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
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
                <div>
                  {selectedDate ? (
                    slots.length > 0 ? (
                      <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-2">
                        {slots.map((slot) => (
                          <div
                            key={slot.id}
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:border-primary-dark transition-colors ${
                              slot.spotsLeft === 0 ? "opacity-50" : ""
                            }`}
                          >
                            <RadioGroupItem value={slot.id} id={`slot-${slot.id}`} disabled={slot.spotsLeft === 0} />
                            <Label htmlFor={`slot-${slot.id}`} className="flex-1 cursor-pointer">
                              <p className="font-medium text-sm">{slot.name}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {slot.time}{slot.end_time ? ` - ${slot.end_time}` : ""} · {slot.duration}</span>
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {slot.spotsLeft === 0 ? (
                                    <span className="text-destructive font-medium">Complet</span>
                                  ) : (
                                    <>{slot.spotsLeft}/{slot.spots} place{slot.spotsLeft > 1 ? "s" : ""}</>
                                  )}
                                </span>
                              </div>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">Aucun créneau disponible pour cette date.</p>
                    )
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">Sélectionnez une date dans le calendrier.</p>
                      {selectedSubData?.type === "course" && availableDays.size > 0 && (
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          Disponible : {Array.from(availableDays).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(4)} disabled={!selectedSlot} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary-dark">Pour combien de personnes ?</h2>
              <div className="rounded-xl border bg-card p-6 max-w-sm">
                <Label htmlFor="participants">Nombre de participants</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Button size="icon" variant="outline" onClick={() => setParticipants(Math.max(1, participants - 1))}>-</Button>
                  <Input
                    id="participants"
                    type="number"
                    min={1}
                    max={selectedSlotData?.spotsLeft || 10}
                    value={participants}
                    onChange={(e) => setParticipants(Math.min(Number(e.target.value), selectedSlotData?.spotsLeft || 10))}
                    className="w-20 text-center"
                  />
                  <Button size="icon" variant="outline" onClick={() => setParticipants(Math.min(selectedSlotData?.spotsLeft || 10, participants + 1))}>+</Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedSlotData?.spotsLeft} places disponibles
                </p>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(3)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={() => setStep(5)} className="gap-1.5">
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-primary-dark">Récapitulatif</h2>
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">Sophie</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prestation</span>
                  <span className="font-medium">{services.find(s => s.id === selectedService)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Activité</span>
                  <span className="font-medium">{selectedSubData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {selectedDate?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créneau</span>
                  <span className="font-medium">{selectedSlotData?.time}{selectedSlotData?.end_time ? ` - ${selectedSlotData.end_time}` : ""} · {selectedSlotData?.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Participants</span>
                  <span className="font-medium">{participants} personne{participants > 1 ? "s" : ""}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">Places restantes après réservation</span>
                  <Badge variant="secondary">{(selectedSlotData?.spotsLeft || 0) - participants}</Badge>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(4)} className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button onClick={handleConfirm} disabled={submitting} className="bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-1.5">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmer la réservation
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
