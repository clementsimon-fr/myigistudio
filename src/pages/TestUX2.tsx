import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Test UX 2 — Ultra-simple booking flow
 * Philosophy: One screen, minimal choices, fast path to reservation.
 * Step 1: Pick activity → Step 2: Pick slot → Step 3: Confirm
 */

type Step = "pick" | "slot" | "confirm" | "done";

interface SlotItem {
  id: string;
  label: string;
  day: string;
  time: string;
  endTime: string;
  spots: number;
  date?: string;
  type: "recurring" | "ponctual";
}

export default function TestUX2() {
  const { courses, schedules, workshops, loading } = useActivitiesData();
  const [step, setStep] = useState<Step>("pick");
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [guestName, setGuestName] = useState("");

  // Build unified activity list
  const activities = useMemo(() => {
    const list: { id: string; name: string; category: string; image: string; type: "course" | "workshop" }[] = [];
    courses.forEach(c => list.push({ id: c.id, name: c.name, category: c.category, image: c.image, type: "course" }));
    workshops.forEach(w => list.push({ id: w.id, name: w.name, category: w.category, image: w.image, type: "workshop" }));
    return list;
  }, [courses, workshops]);

  // Build slots for selected activity
  const slots = useMemo(() => {
    if (!selectedActivity) return [];
    const result: SlotItem[] = [];
    const course = courses.find(c => c.id === selectedActivity);
    if (course) {
      const courseSchedules = schedules.filter(s => s.course_id === course.id);
      courseSchedules.forEach(s => {
        result.push({
          id: s.id, label: `${s.day}`, day: s.day, time: s.time, endTime: s.end_time,
          spots: s.spots_left, type: "recurring"
        });
      });
    }
    const ws = workshops.find(w => w.id === selectedActivity);
    if (ws) {
      result.push({
        id: ws.id, label: format(parseISO(ws.date), "EEEE d MMMM", { locale: fr }),
        day: ws.date, time: ws.time, endTime: ws.end_time, spots: ws.spots_left,
        date: ws.date, type: "ponctual"
      });
    }
    return result;
  }, [selectedActivity, courses, schedules, workshops]);

  const activityName = activities.find(a => a.id === selectedActivity)?.name ?? "";

  const categoryColors: Record<string, string> = {
    yoga: "bg-primary/15 border-primary/30 text-primary-dark",
    poterie: "bg-secondary/20 border-secondary/40 text-secondary-foreground",
    "bien-etre": "bg-accent/15 border-accent/30 text-accent-foreground",
  };

  const reset = () => { setStep("pick"); setSelectedActivity(null); setSelectedSlot(null); setGuestName(""); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Chargement…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center h-14 gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-primary-dark">Réservation express</h1>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-muted h-1">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: step === "pick" ? "33%" : step === "slot" ? "66%" : "100%" }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <main className="container max-w-lg mx-auto py-8 px-4">
        <AnimatePresence mode="wait">
          {/* STEP 1: Pick an activity */}
          {step === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <p className="text-center text-muted-foreground mb-6">Que souhaitez-vous réserver ?</p>
              <div className="space-y-3">
                {activities.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedActivity(a.id); setStep("slot"); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-[1.01] ${categoryColors[a.category] || "bg-card border-border"}`}
                  >
                    <img src={a.image || "/placeholder.svg"} alt={a.name} className="w-14 h-14 rounded-lg object-cover" />
                    <div className="text-left flex-1">
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs opacity-70 capitalize">{a.category}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 -rotate-90 opacity-40" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Pick a slot */}
          {step === "slot" && (
            <motion.div key="slot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep("pick")} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Changer d'activité
              </button>
              <h2 className="text-xl font-display font-bold text-primary-dark mb-2">{activityName}</h2>
              <p className="text-muted-foreground text-sm mb-6">Choisissez votre créneau</p>

              {slots.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun créneau disponible</p>
              ) : (
                <div className="space-y-3">
                  {slots.map(slot => (
                    <button
                      key={slot.id}
                      onClick={() => { setSelectedSlot(slot); setStep("confirm"); }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 transition-all"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary-dark" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium capitalize">{slot.label}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" /> {slot.time} – {slot.endTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {slot.spots} places
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: Confirm */}
          {step === "confirm" && selectedSlot && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <button onClick={() => setStep("slot")} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Changer de créneau
              </button>

              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 space-y-4 mb-6">
                <h2 className="font-display text-lg font-bold text-primary-dark">{activityName}</h2>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> <span className="capitalize">{selectedSlot.label}</span></p>
                  <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {selectedSlot.time} – {selectedSlot.endTime}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Studio IgiStudio</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <label className="text-sm font-medium text-foreground">Votre prénom</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="Ex : Marc"
                  className="w-full h-12 rounded-xl border-2 border-border bg-card px-4 text-base focus:border-primary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base"
                disabled={!guestName.trim()}
                onClick={() => setStep("done")}
              >
                <Check className="h-5 w-5 mr-2" /> Confirmer la réservation
              </Button>
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
              <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-primary-dark" />
              </div>
              <h2 className="text-2xl font-display font-bold text-primary-dark">C'est réservé !</h2>
              <p className="text-muted-foreground">Merci {guestName}, votre place est confirmée pour <span className="font-medium">{activityName}</span>.</p>
              <Button variant="outline" onClick={reset} className="mt-4">Nouvelle réservation</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
