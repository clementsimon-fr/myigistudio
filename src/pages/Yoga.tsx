import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import PricingSection from "@/components/home/PricingSection";
import { supabase } from "@/integrations/supabase/client";

interface Schedule {
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
  instructor: string;
  spots: number;
  spots_left: number;
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
        supabase.from("courses").select("*").eq("category", "yoga"),
        supabase.from("course_schedules").select("*"),
      ]);

      const schedulesMap: Record<string, Schedule[]> = {};
      if (schedulesRes.data) {
        for (const s of schedulesRes.data) {
          if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
          schedulesMap[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, spots_left: s.spots_left });
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
          schedules: schedulesMap[c.id] || [{ day: c.day, time: c.time, end_time: c.end_time || "", spots: c.spots, spots_left: c.spots_left }],
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  // Summarize schedule for display
  const formatScheduleSummary = (schedules: Schedule[]) => {
    return schedules.map(s => `${s.day} ${s.time}${s.end_time ? `-${s.end_time}` : ""}`).join(" · ");
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
              Nos Cours
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, i) => {
                  const totalSpotsLeft = course.schedules.reduce((sum, s) => sum + s.spots_left, 0);
                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-display font-semibold text-lg text-primary-dark">{course.name}</h3>
                          <Badge variant={totalSpotsLeft === 0 ? "destructive" : "secondary"} className="text-xs shrink-0">
                            {totalSpotsLeft === 0 ? "Complet" : `${totalSpotsLeft} place${totalSpotsLeft > 1 ? "s" : ""}`}
                          </Badge>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
                        )}
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatScheduleSummary(course.schedules)}
                          </div>
                          {course.schedules.length > 0 && course.schedules[0].time && course.schedules[0].end_time && (
                            <div className="text-xs text-muted-foreground">
                              Durée : {calcDuration(course.schedules[0].time, course.schedules[0].end_time)}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            {course.instructor}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {course.schedules[0]?.spots || course.spots} places max
                          </div>
                        </div>
                        <Link to={`/reserver?type=course&id=${course.id}`}>
                          <Button size="sm" className="w-full" disabled={totalSpotsLeft === 0}>
                            {totalSpotsLeft === 0 ? "Complet" : "Réserver"}
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <PricingSection />

        <section className="py-16">
          <div className="container max-w-2xl text-center">
            <h2 className="text-2xl font-display font-bold text-primary-dark mb-4">Infos Pratiques</h2>
            <div className="space-y-3 text-muted-foreground text-sm">
              <p>Arrivez 10 minutes avant le cours · Tapis fournis · Tenue confortable</p>
              <p>Annulation gratuite jusqu'à 24h avant le cours. Au-delà, le crédit est débité.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
