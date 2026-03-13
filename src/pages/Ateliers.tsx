import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, Euro, Calendar, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Workshop {
  id: string;
  name: string;
  description: string;
  long_description: string;
  date: string;
  time: string;
  end_time: string;
  duration: string;
  frequency: string;
  price: number;
  spots: number;
  spots_left: number;
  image: string;
}

export default function Ateliers() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [descriptionWs, setDescriptionWs] = useState<Workshop | null>(null);

  useEffect(() => {
    supabase.from("workshops").select("*").eq("category", "bien-etre").order("date").then(({ data }) => {
      if (data) setWorkshops(data as unknown as Workshop[]);
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
              Ateliers & Stages
            </motion.h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Qi Gong, Breathwork, méthode Wim Hof, Cérémonie Cacao… Des expériences uniques pour explorer le bien-être.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-dark mb-8 text-center">
              Prochains Ateliers
            </h2>
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {workshops.map((ws, i) => (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {ws.image && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={ws.image} alt={ws.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-display font-semibold text-lg text-primary-dark">{ws.name}</h3>
                        <Badge variant={ws.spots_left <= 3 ? "destructive" : "secondary"} className="text-xs shrink-0">
                          {ws.spots_left} place{ws.spots_left > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{ws.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(ws.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {ws.time}{ws.end_time ? ` - ${ws.end_time}` : ""} · {ws.duration}
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
                      {ws.frequency && ws.frequency !== "ponctuel" && (
                        <Badge variant="outline" className="text-xs capitalize mb-3">{ws.frequency}</Badge>
                      )}
                      <div className="flex gap-2">
                        {(ws.long_description || ws.description) && (
                          <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setDescriptionWs(ws)}>
                            <Info className="h-3.5 w-3.5" /> Description
                          </Button>
                        )}
                        <Link to={`/reserver?type=workshop&id=${ws.id}`} className="flex-1">
                          <Button size="sm" className="w-full">Réserver</Button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <Dialog open={!!descriptionWs} onOpenChange={(open) => !open && setDescriptionWs(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {descriptionWs && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{descriptionWs.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {descriptionWs.image && (
                  <img src={descriptionWs.image} alt={descriptionWs.name} className="w-full rounded-lg object-cover max-h-64" />
                )}
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                  {descriptionWs.long_description || descriptionWs.description}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Euro className="h-3.5 w-3.5" /> {descriptionWs.price}€</div>
                  <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {descriptionWs.duration}</div>
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {descriptionWs.spots} places max</div>
                </div>
                <Link to={`/reserver?type=workshop&id=${descriptionWs.id}`}>
                  <Button className="w-full">Réserver</Button>
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
