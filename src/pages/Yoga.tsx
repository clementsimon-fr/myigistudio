import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { pricingCards } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

interface Course {
  id: string;
  name: string;
  description: string;
  day: string;
  days: string[];
  time: string;
  end_time: string;
  duration: string;
  frequency: string;
  instructor: string;
  spots: number;
  spots_left: number;
}

export default function Yoga() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("courses").select("*").order("time").then(({ data }) => {
      if (data) setCourses(data as unknown as Course[]);
      setLoading(false);
    });
  }, []);

  // Expand courses with multiple days into per-day entries for display
  const expandedByDay = (day: string) => {
    return courses.filter(c => {
      if (c.days && c.days.length > 0) return c.days.includes(day);
      return c.day === day;
    });
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
                  const dayCourses = expandedByDay(day);
                  if (dayCourses.length === 0) return null;
                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                    >
                      <h3 className="text-lg font-semibold text-primary-dark mb-3 font-display">{day}</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dayCourses.map((course) => (
                          <div
                            key={`${course.id}-${day}`}
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
                                {course.time}{course.end_time ? ` - ${course.end_time}` : ""} · {course.duration}
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
