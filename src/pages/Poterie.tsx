import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, Euro, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Workshop {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  price: number;
  spots: number;
  spots_left: number;
  image: string;
}

export default function Poterie() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("workshops").select("*").eq("category", "poterie").order("date").then(({ data }) => {
      if (data) setWorkshops(data as Workshop[]);
      setLoading(false);
    });
  }, []);

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
              Poterie
            </motion.h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Initiez-vous au tour de potier, explorez les engobes ou peignez sur céramique dans notre atelier dédié.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-dark mb-8 text-center">
              Nos Ateliers Poterie
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workshops.map((ws, i) => (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={ws.image} alt={ws.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-display font-semibold text-lg text-primary-dark">{ws.name}</h3>
                        <Badge variant={ws.spots_left <= 2 ? "destructive" : "secondary"} className="text-xs shrink-0">
                          {ws.spots_left} place{ws.spots_left > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{ws.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(ws.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {ws.time} · {ws.duration}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {ws.spots} places max
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Euro className="h-3.5 w-3.5" />
                          {ws.price}€
                        </div>
                      </div>
                      <Link to="/reserver">
                        <Button size="sm" className="w-full">Réserver</Button>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
