import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, Sparkles, Clock, Users, Heart, Star, Zap, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Test UX 3 — Creative & playful
 * Tinder-style swipe cards for activity discovery + gamified booking
 */

interface ActivityCard {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  emoji: string;
  slots: { label: string; time: string; endTime: string; spots: number }[];
}

const CATEGORY_EMOJI: Record<string, string> = { yoga: "🧘", poterie: "🏺", "bien-etre": "🌿" };
const CATEGORY_GRADIENT: Record<string, string> = {
  yoga: "from-primary/20 to-primary/5",
  poterie: "from-secondary/30 to-secondary/10",
  "bien-etre": "from-accent/20 to-accent/5",
};

export default function TestUX3() {
  const { courses, schedules, workshops, loading } = useActivitiesData();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);
  const [showDetail, setShowDetail] = useState<ActivityCard | null>(null);
  const [booked, setBooked] = useState<string | null>(null);

  const cards = useMemo<ActivityCard[]>(() => {
    const list: ActivityCard[] = [];
    courses.forEach(c => {
      const courseSlots = schedules.filter(s => s.course_id === c.id).map(s => ({
        label: s.day, time: s.time, endTime: s.end_time, spots: s.spots_left
      }));
      list.push({
        id: c.id, name: c.name, category: c.category, description: c.description,
        image: c.image, emoji: CATEGORY_EMOJI[c.category] || "✨", slots: courseSlots
      });
    });
    workshops.forEach(w => {
      list.push({
        id: w.id, name: w.name, category: w.category, description: w.description,
        image: w.image, emoji: CATEGORY_EMOJI[w.category] || "✨",
        slots: [{ label: format(parseISO(w.date), "EEEE d MMM", { locale: fr }), time: w.time, endTime: w.end_time, spots: w.spots_left }]
      });
    });
    return list;
  }, [courses, schedules, workshops]);

  const current = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const next = () => setCurrentIndex(i => Math.min(i + 1, cards.length - 1));
  const prev = () => setCurrentIndex(i => Math.max(i - 1, 0));

  const handleLike = () => {
    if (current) {
      setLiked(l => l.includes(current.id) ? l.filter(x => x !== current.id) : [...l, current.id]);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Chargement…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg font-semibold text-primary-dark flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> Découvrir
          </h1>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">{liked.length}</span>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-muted h-1">
        <motion.div className="h-full bg-accent" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      <main className="container max-w-md mx-auto py-6 px-4">
        {/* Detail overlay */}
        <AnimatePresence>
          {showDetail && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-0 z-50 bg-background overflow-y-auto"
            >
              <div className="sticky top-0 bg-background/95 backdrop-blur z-10 flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-display font-bold text-primary-dark">{showDetail.name}</h2>
                <button onClick={() => setShowDetail(null)} className="p-2 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                <img src={showDetail.image || "/placeholder.svg"} alt={showDetail.name} className="w-full h-48 rounded-2xl object-cover" />
                <p className="text-foreground leading-relaxed">{showDetail.description}</p>

                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Créneaux disponibles</h3>
                  <div className="space-y-2">
                    {showDetail.slots.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setBooked(showDetail.name); setShowDetail(null); }}
                        className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/40 bg-card transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">{showDetail.emoji}</div>
                          <div className="text-left">
                            <p className="font-medium capitalize text-sm">{s.label}</p>
                            <p className="text-xs text-muted-foreground">{s.time} – {s.endTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {s.spots}
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booked overlay */}
        <AnimatePresence>
          {booked && (
            <motion.div
              key="booked"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center"
            >
              <div className="text-center space-y-4 p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="text-6xl"
                >🎉</motion.div>
                <h2 className="text-2xl font-display font-bold text-primary-dark">Bravo !</h2>
                <p className="text-muted-foreground">Vous avez réservé <span className="font-semibold text-foreground">{booked}</span></p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="outline" onClick={() => { setBooked(null); }}>Continuer à explorer</Button>
                  <Button onClick={() => { setBooked(null); setLiked([]); setCurrentIndex(0); }}>Recommencer</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe Card */}
        {current ? (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.25 }}
                className={`rounded-3xl overflow-hidden border-2 border-border bg-gradient-to-b ${CATEGORY_GRADIENT[current.category] || "from-card to-card"}`}
              >
                <div className="relative">
                  <img src={current.image || "/placeholder.svg"} alt={current.name} className="w-full h-56 object-cover" />
                  <div className="absolute top-3 left-3 bg-background/90 backdrop-blur rounded-full px-3 py-1 text-sm font-medium flex items-center gap-1.5">
                    {current.emoji} {current.category}
                  </div>
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={handleLike}
                      className={`p-2 rounded-full backdrop-blur transition-all ${liked.includes(current.id) ? "bg-destructive/20 text-destructive" : "bg-background/70 text-muted-foreground hover:text-destructive"}`}
                    >
                      <Heart className={`h-5 w-5 ${liked.includes(current.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h2 className="text-xl font-display font-bold text-primary-dark">{current.name}</h2>
                  <p className="text-sm text-muted-foreground line-clamp-2">{current.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {current.slots.length} créneau{current.slots.length > 1 ? "x" : ""}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Places disponibles</span>
                  </div>

                  <Button className="w-full rounded-xl h-11" onClick={() => setShowDetail(current)}>
                    <Zap className="h-4 w-4 mr-2" /> Voir les créneaux & réserver
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between px-2">
              <Button variant="outline" size="sm" onClick={prev} disabled={currentIndex === 0} className="rounded-full">
                ← Précédent
              </Button>
              <span className="text-sm text-muted-foreground">{currentIndex + 1} / {cards.length}</span>
              <Button variant="outline" size="sm" onClick={next} disabled={currentIndex === cards.length - 1} className="rounded-full">
                Suivant →
              </Button>
            </div>

            {/* Liked list */}
            {liked.length > 0 && (
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="font-display font-semibold text-primary-dark flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4 text-destructive fill-current" /> Mes coups de cœur ({liked.length})
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {liked.map(id => {
                    const c = cards.find(x => x.id === id);
                    return c ? (
                      <button
                        key={id}
                        onClick={() => { setCurrentIndex(cards.indexOf(c)); }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-sm hover:border-primary/40 transition-colors"
                      >
                        <span>{c.emoji}</span> {c.name}
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-12">Aucune activité disponible</p>
        )}
      </main>
    </div>
  );
}
