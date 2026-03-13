import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PricingSection from "@/components/home/PricingSection";
import { supabase } from "@/integrations/supabase/client";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface Schedule {
  day: string;
  time: string;
  end_time: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  instructor: string;
  spots: number;
  spots_left: number;
  frequency: string;
  schedules: Schedule[];
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

export default function Yoga() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [coursesRes, schedulesRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("course_schedules").select("*"),
      ]);

      const schedulesMap: Record<string, Schedule[]> = {};
      if (schedulesRes.data) {
        for (const s of schedulesRes.data) {
          if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
          schedulesMap[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time });
        }
      }

      if (coursesRes.data) {
        setCourses(coursesRes.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          instructor: c.instructor,
          spots: c.spots,
          spots_left: c.spots_left,
          frequency: c.frequency || "hebdomadaire",
          schedules: schedulesMap[c.id] || [{ day: c.day, time: c.time, end_time: c.end_time || "" }],
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  // Get courses that have a schedule on a given day, with the specific time for that day
  const getCoursesForDay = (day: string) => {
    const result: { course: Course; schedule: Schedule }[] = [];
    for (const course of courses) {
      for (const schedule of course.schedules) {
        if (schedule.day === day) {
          result.push({ course, schedule });
        }
      }
    }
    return result.sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="bg-secondary/30 py-16">
          <div className="container text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-display font-bold text-primary-dark mb-4"
            >
              Yoga & Pilates
            </motion.h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Vinyasa, Yin, Pilates, Prénatal… Trouvez le cours qui vous correspond parmi nos créneaux hebdomadaires.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-dark mb-8 text-center">
              Planning Hebdomadaire
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-6">
                {days.map((day) => {
                  const dayEntries = getCoursesForDay(day);
                  if (dayEntries.length === 0) return null;
                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <h3 className="text-lg font-semibold text-primary-dark mb-3 font-display">{day}</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dayEntries.map(({ course, schedule }) => (
                          <div
                            key={`${course.id}-${day}-${schedule.time}`}
                            className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-foreground">{course.name}</h4>
                              <Badge
                                variant={course.spots_left === 0 ? "destructive" : "secondary"}
                                className="text-xs shrink-0"
                              >
                                {course.spots_left === 0
                                  ? "Complet"
                                  : `${course.spots_left} place${course.spots_left > 1 ? "s" : ""}`}
                              </Badge>
                            </div>
                            {course.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{course.description}</p>
                            )}
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                {schedule.time}{schedule.end_time ? ` - ${schedule.end_time}` : ""}
                                {schedule.time && schedule.end_time && ` · ${calcDuration(schedule.time, schedule.end_time)}`}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5" />
                                {course.instructor}
                              </div>
                            </div>
                            <Link to="/reserver" className="mt-3 block">
                              <Button
                                size="sm"
                                className="w-full"
                                disabled={course.spots_left === 0}
                                variant={course.spots_left === 0 ? "outline" : "default"}
                              >
                                {course.spots_left === 0 ? "Liste d'attente" : "Réserver"}
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="py-16 bg-muted/40">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-dark mb-8 text-center">
              Tarifs
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {pricingCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl border p-5 bg-card ${
                    card.popular ? "border-primary-dark ring-2 ring-primary-dark/20" : ""
                  }`}
                >
                  <h3 className="font-display font-semibold text-primary-dark">{card.name}</h3>
                  <div className="mt-2">
                    <span className="text-2xl font-bold">{card.price}€</span>
                    <span className="text-sm text-muted-foreground ml-1">
                      · {typeof card.sessions === "number" ? `${card.sessions} cours` : card.sessions} · {card.validity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-2xl text-center">
            <h2 className="text-2xl font-display font-bold text-primary-dark mb-4">Infos Pratiques</h2>
            <div className="space-y-3 text-muted-foreground text-sm">
              <div className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Arrivez 10 minutes avant le cours · Tapis fournis · Tenue confortable
              </div>
              <p>Annulation gratuite jusqu'à 24h avant le cours. Au-delà, le crédit est débité.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
