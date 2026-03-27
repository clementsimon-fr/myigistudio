import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Home, Search, Calendar, User, Clock, Users, MapPin, ChevronRight, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { format, parseISO, addDays, startOfWeek, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Test UX 4 — Mobile-first expert design
 * Bottom tab navigation, stories-style categories, horizontal scroll feeds,
 * quick-book floating actions, iOS-style modals.
 */

type Tab = "home" | "search" | "calendar" | "profile";

interface FeedItem {
  id: string;
  name: string;
  category: string;
  image: string;
  time: string;
  endTime: string;
  dayLabel: string;
  spots: number;
  type: "recurring" | "ponctual";
}

const CAT_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  yoga: { bg: "bg-primary/15", ring: "ring-primary", text: "text-primary-dark" },
  poterie: { bg: "bg-secondary/20", ring: "ring-secondary", text: "text-secondary-foreground" },
  "bien-etre": { bg: "bg-accent/15", ring: "ring-accent", text: "text-accent-foreground" },
};
const CAT_EMOJI: Record<string, string> = { yoga: "🧘", poterie: "🏺", "bien-etre": "🌿" };

export default function TestUX4() {
  const { courses, schedules, workshops, loading } = useActivitiesData();
  const [tab, setTab] = useState<Tab>("home");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<FeedItem | null>(null);
  const [search, setSearch] = useState("");
  const [bookedId, setBookedId] = useState<string | null>(null);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach(c => cats.add(c.category));
    workshops.forEach(w => cats.add(w.category));
    return Array.from(cats);
  }, [courses, workshops]);

  // Feed items
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    courses.forEach(c => {
      const courseScheds = schedules.filter(s => s.course_id === c.id);
      courseScheds.forEach(s => {
        items.push({
          id: `${c.id}-${s.id}`, name: c.name, category: c.category, image: c.image,
          time: s.time, endTime: s.end_time, dayLabel: s.day, spots: s.spots_left, type: "recurring"
        });
      });
    });
    workshops.forEach(w => {
      items.push({
        id: w.id, name: w.name, category: w.category, image: w.image,
        time: w.time, endTime: w.end_time,
        dayLabel: format(parseISO(w.date), "EEE d MMM", { locale: fr }),
        spots: w.spots_left, type: "ponctual"
      });
    });
    return items;
  }, [courses, schedules, workshops]);

  const filteredFeed = useMemo(() => {
    let list = feed;
    if (selectedCat) list = list.filter(f => f.category === selectedCat);
    if (search) list = list.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [feed, selectedCat, search]);

  // Weekly calendar
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      return { date: d, label: format(d, "EEE", { locale: fr }), num: format(d, "d"), isToday: format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") };
    });
  }, []);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Chargement…</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Status bar mock */}
      <div className="bg-primary-dark text-primary-dark-foreground text-center text-xs py-1 font-medium">
        MyIgiStudio
      </div>

      {/* iOS-style modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl overflow-hidden"
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3" />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <img src={showModal.image || "/placeholder.svg"} alt={showModal.name} className="w-16 h-16 rounded-2xl object-cover" />
                  <div>
                    <h3 className="font-display font-bold text-primary-dark">{showModal.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{showModal.category}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-muted p-3 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-medium">{showModal.time}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3 text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-medium">{showModal.spots} places</p>
                  </div>
                  <div className="rounded-xl bg-muted p-3 text-center">
                    <MapPin className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-medium">Studio</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> {showModal.dayLabel} • {showModal.time} – {showModal.endTime}
                </p>
                {bookedId === showModal.id ? (
                  <div className="text-center py-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl mb-2">✅</motion.div>
                    <p className="font-semibold text-primary-dark">Réservé !</p>
                  </div>
                ) : (
                  <Button className="w-full h-12 rounded-2xl text-base" onClick={() => setBookedId(showModal.id)}>
                    Réserver maintenant
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === "home" && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4">
            {/* Welcome */}
            <div className="mb-5">
              <h1 className="text-2xl font-display font-bold text-primary-dark">Bonjour 👋</h1>
              <p className="text-sm text-muted-foreground mt-1">Trouvez votre prochaine séance</p>
            </div>

            {/* Stories-style categories */}
            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => {
                const c = CAT_COLORS[cat] || CAT_COLORS.yoga;
                const active = selectedCat === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCat(active ? null : cat)}
                    className="flex flex-col items-center gap-1.5 min-w-[4.5rem]"
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ring-2 ring-offset-2 transition-all ${active ? `${c.ring} ${c.bg}` : "ring-transparent bg-muted"}`}>
                      {CAT_EMOJI[cat] || "✨"}
                    </div>
                    <span className={`text-xs font-medium capitalize ${active ? c.text : "text-muted-foreground"}`}>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Featured horizontal scroll */}
            <h2 className="font-display font-semibold text-foreground mb-3">À ne pas manquer</h2>
            <div className="flex gap-3 overflow-x-auto pb-3 mb-6 scrollbar-hide">
              {filteredFeed.slice(0, 6).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setShowModal(item); setBookedId(null); }}
                  className="min-w-[10rem] rounded-2xl overflow-hidden border border-border bg-card flex-shrink-0 hover:shadow-md transition-shadow"
                >
                  <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-full h-24 object-cover" />
                  <div className="p-3">
                    <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {item.time}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Full list */}
            <h2 className="font-display font-semibold text-foreground mb-3">Toutes les séances</h2>
            <div className="space-y-2">
              {filteredFeed.map(item => {
                const c = CAT_COLORS[item.category] || CAT_COLORS.yoga;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setShowModal(item); setBookedId(null); }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
                  >
                    <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.dayLabel} • {item.time}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>{item.spots}</div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === "search" && (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4">
            <h1 className="text-xl font-display font-bold text-primary-dark mb-4">Rechercher</h1>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Yoga, poterie, atelier…"
                className="w-full h-12 rounded-2xl border-2 border-border bg-card pl-10 pr-4 text-base focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            {search ? (
              <div className="space-y-2">
                {filteredFeed.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun résultat pour "{search}"</p>
                ) : filteredFeed.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setShowModal(item); setBookedId(null); }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
                  >
                    <img src={item.image || "/placeholder.svg"} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.dayLabel} • {item.time}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 text-center text-muted-foreground py-8">
                <Search className="h-8 w-8 mx-auto opacity-30" />
                <p>Tapez le nom d'une activité</p>
              </div>
            )}
          </motion.div>
        )}

        {tab === "calendar" && (
          <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-4">
            <h1 className="text-xl font-display font-bold text-primary-dark mb-4">Planning</h1>
            {/* Week strip */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {weekDays.map(d => (
                <button
                  key={d.num}
                  onClick={() => setSelectedDay(selectedDay === d.label ? null : d.label)}
                  className={`flex flex-col items-center p-2 rounded-2xl min-w-[3.5rem] transition-all ${
                    d.isToday ? "bg-primary text-primary-foreground" :
                    selectedDay === d.label ? "bg-primary/15 text-primary-dark" :
                    "bg-card border border-border"
                  }`}
                >
                  <span className="text-[10px] uppercase font-medium">{d.label}</span>
                  <span className="text-lg font-bold">{d.num}</span>
                </button>
              ))}
            </div>
            {/* Day's sessions */}
            <div className="space-y-2">
              {feed.filter(f => !selectedDay || f.dayLabel.toLowerCase().startsWith(selectedDay.toLowerCase().slice(0, 3))).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setShowModal(item); setBookedId(null); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-primary-dark">{item.time}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.dayLabel}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "profile" && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pt-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-primary-dark" />
            </div>
            <h2 className="font-display text-xl font-bold text-primary-dark">Visiteur</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Connectez-vous pour gérer vos réservations</p>
            <div className="space-y-3 max-w-xs mx-auto">
              <Button className="w-full rounded-2xl h-11">Se connecter</Button>
              <Button variant="outline" className="w-full rounded-2xl h-11">Créer un compte</Button>
            </div>
            <Link to="/" className="block mt-8 text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Retour au site
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          {([
            { key: "home" as Tab, icon: Home, label: "Accueil" },
            { key: "search" as Tab, icon: Search, label: "Recherche" },
            { key: "calendar" as Tab, icon: Calendar, label: "Planning" },
            { key: "profile" as Tab, icon: User, label: "Profil" },
          ]).map(t => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${active ? "text-primary-dark" : "text-muted-foreground"}`}
              >
                <t.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span className="text-[10px] font-medium">{t.label}</span>
                {active && <motion.div layoutId="tab-indicator" className="w-1 h-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
