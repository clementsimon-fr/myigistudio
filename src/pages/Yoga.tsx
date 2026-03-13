import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { yogaSchedule, pricingCards } from "@/data/mockData";

const days = ["Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function Yoga() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
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
              Vinyasa, Yin, Pilates, Prénatal… Trouvez le cours qui vous correspond parmi nos 20+ créneaux hebdomadaires.
            </p>
          </div>
        </section>

        {/* Planning */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-dark mb-8 text-center">
              Planning Hebdomadaire
            </h2>
            <div className="grid gap-6">
              {days.map((day) => {
                const dayCourses = yogaSchedule.filter((c) => c.day === day);
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
                          key={course.id}
                          className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-foreground">{course.name}</h4>
                            <Badge
                              variant={course.spotsLeft === 0 ? "destructive" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {course.spotsLeft === 0
                                ? "Complet"
                                : `${course.spotsLeft} place${course.spotsLeft > 1 ? "s" : ""}`}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              {course.time} · {course.duration}
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
                              disabled={course.spotsLeft === 0}
                              variant={course.spotsLeft === 0 ? "outline" : "default"}
                            >
                              {course.spotsLeft === 0 ? "Liste d'attente" : "Réserver"}
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tarifs */}
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

        {/* Infos pratiques */}
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
