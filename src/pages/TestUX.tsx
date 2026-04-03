import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, Clock, MapPin, Users, ChevronRight, Sparkles, X, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

const PLACEHOLDER_IMG = "/placeholder.svg";
const YOGA_WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || { block: "", dot: "", text: "text-primary-dark", bookBtn: "bg-primary hover:bg-primary/90 text-primary-foreground" };
}

/** Timeline item for the "what's happening" feed */
interface TimelineItem {
  id: string;
  date: Date;
  name: string;
  time: string;
  endTime: string;
  category: string;
  type: "course" | "workshop";
  sourceId: string;
  image: string;
  instructor?: string;
  instructorPhoto?: string;
  description?: string;
  price?: number;
  spotsLeft?: number;
  duration?: string;
}

interface ThemeDiscoveryCard {
  id: "yoga" | "poterie" | "bien-etre";
  title: string;
  description: string;
  sessions: number;
}

interface YogaWeeklyPlanDay {
  day: string;
  sessions: {
    courseId: string;
    name: string;
    time: string;
    endTime: string;
    spotsLeft: number;
  }[];
}

function buildTimeline(courses: Course[], workshops: Workshop[], schedules: Schedule[], getPhoto: (id: string | null, name?: string) => string | undefined): TimelineItem[] {
  const items: TimelineItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMap: Record<string, number> = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0 };

  // Courses: generate next 2 weeks of recurring dates
  for (const course of courses) {
    const courseScheds = schedules.filter(s => s.course_id === course.id);
    for (const sched of courseScheds) {
      const target = dayMap[sched.day];
      if (target === undefined) continue;
      for (let week = 0; week < 2; week++) {
        const d = new Date(today);
        let diff = target - d.getDay();
        if (diff < 0) diff += 7;
        d.setDate(d.getDate() + diff + week * 7);
        if (d >= today) {
          items.push({
            id: `${course.id}-${sched.id}-${d.toISOString()}`,
            date: d,
            name: course.name,
            time: sched.time,
            endTime: sched.end_time,
            category: course.category,
            type: "course",
            sourceId: course.id,
            image: course.image || PLACEHOLDER_IMG,
            instructor: course.instructor,
            instructorPhoto: getPhoto(course.instructor_id, course.instructor),
            description: course.description,
            spotsLeft: sched.spots_left,
            duration: calcDur(sched.time, sched.end_time),
          });
        }
      }
    }
  }

  // Workshops: future dates
  for (const ws of workshops) {
    const d = new Date(ws.date + "T12:00:00");
    if (d >= today) {
      items.push({
        id: ws.id,
        date: d,
        name: ws.name,
        time: ws.time,
        endTime: ws.end_time,
        category: ws.category,
        type: "workshop",
        sourceId: ws.id,
        image: ws.image || PLACEHOLDER_IMG,
        description: ws.description,
        price: ws.price,
        spotsLeft: ws.spots_left,
        duration: ws.duration || calcDur(ws.time, ws.end_time),
      });
    }
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function calcDur(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function groupByDay(items: TimelineItem[]): { label: string; date: Date; items: TimelineItem[] }[] {
  const groups: Map<string, { label: string; date: Date; items: TimelineItem[] }> = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const item of items) {
    const key = item.date.toISOString().split("T")[0];
    if (!groups.has(key)) {
      let label: string;
      if (item.date.getTime() === today.getTime()) label = "Aujourd'hui";
      else if (item.date.getTime() === tomorrow.getTime()) label = "Demain";
      else label = item.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      groups.set(key, { label, date: item.date, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  return [...groups.values()];
}

/** Category pill selector */
function CategoryPills({ selected, onChange }: { selected: string; onChange: (v: string) => void }) {
  const cats = [
    { value: "all", label: "Tout", color: "bg-primary-dark" },
    { value: "yoga", label: "Yoga & Pilates", color: "bg-[hsl(210,60%,55%)]" },
    { value: "poterie", label: "Poterie", color: "bg-[hsl(40,76%,60%)]" },
    { value: "bien-etre", label: "Ateliers", color: "bg-[hsl(0,55%,58%)]" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {cats.map(c => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selected === c.value
              ? `${c.color} text-white shadow-md scale-105`
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

/** Horizontal scrolling activity card (discovery style) */
function HorizontalCard({ item, onSelect }: { item: TimelineItem; onSelect: () => void }) {
  const style = getCategoryStyle(item.category);
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="flex-shrink-0 w-72 rounded-2xl overflow-hidden bg-card border shadow-sm hover:shadow-lg transition-shadow text-left"
    >
      <div className="h-40 overflow-hidden relative">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${style.dot} text-white`}>
            {item.category === "bien-etre" ? "Atelier" : item.category}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className={`font-display font-semibold text-sm mb-1 ${style.text}`}>{item.name}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{item.time?.slice(0, 5).replace(":", "h")}</span>
          {item.duration && <span>· {item.duration}</span>}
        </div>
        {item.instructor && (
          <div className="flex items-center gap-1.5 mt-2">
            <Avatar className="h-4 w-4">
              {item.instructorPhoto ? <AvatarImage src={item.instructorPhoto} /> : null}
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{item.instructor.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{item.instructor}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

/** Detail panel that slides up */
function DetailPanel({ item, onClose }: { item: TimelineItem; onClose: () => void }) {
  const style = getCategoryStyle(item.category);
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background"
    >
      <div className="h-full overflow-y-auto">
        <div className="relative h-64">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 -mt-16 relative z-10 pb-8">
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${style.dot} text-white mb-3`}>
            {item.category === "bien-etre" ? "Atelier" : item.category}
          </span>
          <h1 className={`text-2xl font-display font-bold mb-2 ${style.text}`}>{item.name}</h1>

          {item.description && (
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{item.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Date</p>
                <p className="text-xs font-medium capitalize">{item.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Horaire</p>
                <p className="text-xs font-medium">{item.time?.slice(0, 5).replace(":", "h")} - {item.endTime?.slice(0, 5).replace(":", "h")}</p>
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Lieu</p>
                <p className="text-xs font-medium">Studio MyIgi</p>
              </div>
            </div>
            {item.spotsLeft !== undefined && (
              <div className="rounded-xl bg-muted/50 p-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Places</p>
                  <p className={`text-xs font-medium ${item.spotsLeft <= 2 ? "text-destructive" : ""}`}>{item.spotsLeft} disponible{item.spotsLeft > 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
          </div>

          {item.instructor && (
            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-muted/30">
              <Avatar className="h-10 w-10">
                {item.instructorPhoto ? <AvatarImage src={item.instructorPhoto} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{item.instructor.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{item.instructor}</p>
                <p className="text-xs text-muted-foreground">Intervenant(e)</p>
              </div>
            </div>
          )}

          {item.price !== undefined && item.price > 0 && (
            <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <span className="text-sm text-muted-foreground">À partir de</span>
              <span className="text-xl font-bold text-primary-dark">{item.price} €</span>
            </div>
          )}

          <Link to={`/reserver?type=${item.type}&id=${item.sourceId}&date=${item.date.toISOString().split("T")[0]}`}>
            <Button className={`w-full h-12 text-base font-semibold rounded-xl ${style.bookBtn}`}>
              Réserver cette séance <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function TestUX() {
  const { courses, schedules, workshops, loading, getInstructorPhoto } = useActivitiesData();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const timelineRef = useRef<HTMLElement | null>(null);

  const timeline = useMemo(() => {
    return buildTimeline(courses, workshops, schedules, getInstructorPhoto);
  }, [courses, workshops, schedules, getInstructorPhoto]);

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return timeline;
    return timeline.filter(i => i.category === selectedCategory);
  }, [timeline, selectedCategory]);

  const grouped = useMemo(() => groupByDay(filtered), [filtered]);

  const featured = useMemo(() => {
    const seen = new Set<string>();
    const result: TimelineItem[] = [];
    for (const item of timeline) {
      if (!seen.has(item.name) && result.length < 5) {
        seen.add(item.name);
        result.push(item);
      }
    }
    return result;
  }, [timeline]);

  const themeDiscovery = useMemo<ThemeDiscoveryCard[]>(() => {
    const count = (cat: string) => timeline.filter(t => t.category === cat).length;
    return [
      {
        id: "yoga",
        title: "Flow Yoga",
        description: "Cours réguliers, progression par niveau et créneaux matin/soir.",
        sessions: count("yoga"),
      },
      {
        id: "poterie",
        title: "Poterie studio",
        description: "Sessions guidées, créations libres et formats découverte.",
        sessions: count("poterie"),
      },
      {
        id: "bien-etre",
        title: "Ateliers bien-être",
        description: "Formats ponctuels pour souffler, explorer et recharger.",
        sessions: count("bien-etre"),
      },
    ];
  }, [timeline]);

  const yogaWeeklyPlan = useMemo<YogaWeeklyPlanDay[]>(() => {
    const yogaCoursesMap = new Map(
      courses
        .filter(c => c.category === "yoga")
        .map(c => [c.id, c] as const)
    );

    const sessionsByDay = Object.fromEntries(YOGA_WEEK_DAYS.map(day => [day, [] as YogaWeeklyPlanDay["sessions"]]));

    for (const sched of schedules) {
      const course = yogaCoursesMap.get(sched.course_id);
      if (!course || !sessionsByDay[sched.day]) continue;
      sessionsByDay[sched.day].push({
        courseId: course.id,
        name: course.name,
        time: sched.time,
        endTime: sched.end_time,
        spotsLeft: sched.spots_left,
      });
    }

    for (const day of YOGA_WEEK_DAYS) {
      sessionsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
    }

    return YOGA_WEEK_DAYS.map(day => ({ day, sessions: sessionsByDay[day] }));
  }, [courses, schedules]);

  const handleThemeSelect = (category: ThemeDiscoveryCard["id"]) => {
    setSelectedCategory(category);
    setTimeout(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const openSessionFromYogaPlanning = (sessionName: string) => {
    setSelectedCategory("yoga");
    const nextSession = timeline.find(item => item.category === "yoga" && item.name === sessionName);
    if (nextSession) setSelectedItem(nextSession);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Retour</span>
          </Link>
          <h1 className="font-display font-bold">
            <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <section className="pt-8 pb-4 px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm mb-1">Bienvenue 👋</p>
          <h2 className="text-2xl font-display font-bold text-foreground">Que souhaitez-vous pratiquer ?</h2>
        </motion.div>
      </section>

      <section className="px-6 mb-8">
        <h3 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Compass className="h-4 w-4" /> Explorer par thème
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {themeDiscovery.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme.id)}
              className="rounded-2xl border bg-card p-4 text-left hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-display font-semibold text-foreground">{theme.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
                </div>
                <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-1">
                  {theme.sessions} séances
                </span>
              </div>
              <div className="mt-3 text-xs font-medium text-primary flex items-center gap-1">
                Découvrir ce thème <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 mb-8">
        <CategoryPills selected={selectedCategory} onChange={setSelectedCategory} />
      </section>

      {selectedCategory === "all" && featured.length > 0 && (
        <section className="mb-8">
          <h3 className="px-6 text-sm font-display font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            ✨ À ne pas manquer
          </h3>
          <div className="flex gap-4 overflow-x-auto px-6 pb-2 no-scrollbar">
            {featured.map(item => (
              <HorizontalCard key={item.id} item={item} onSelect={() => setSelectedItem(item)} />
            ))}
          </div>
        </section>
      )}

      <section className="px-6 mb-8">
        <h3 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          🗓️ Planning type Yoga (hebdo)
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Vue compacte des séances yoga récurrentes. Touchez un créneau pour ouvrir le détail le plus proche.
        </p>
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-3 min-w-[860px]">
            {yogaWeeklyPlan.map(day => (
              <div key={day.day} className="rounded-2xl border bg-card p-3 min-h-[168px]">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">{day.day.slice(0, 3)}</p>
                <div className="space-y-2">
                  {day.sessions.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  ) : (
                    day.sessions.map((session, idx) => (
                      <button
                        key={`${session.courseId}-${session.time}-${idx}`}
                        onClick={() => openSessionFromYogaPlanning(session.name)}
                        className="w-full rounded-lg bg-muted/50 hover:bg-muted p-2 transition-colors text-left"
                      >
                        <p className="text-[11px] font-semibold text-foreground line-clamp-1">{session.name}</p>
                        <p className="text-[10px] text-muted-foreground">{session.time?.slice(0, 5).replace(":", "h")} - {session.endTime?.slice(0, 5).replace(":", "h")}</p>
                        {session.spotsLeft <= 3 && (
                          <p className="text-[10px] text-destructive mt-0.5">{session.spotsLeft} places</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={timelineRef} className="px-6 pb-12">
        <h3 className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          📅 Prochaines séances
        </h3>
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground capitalize">{group.label}</h4>
              </div>
              <div className="space-y-2 ml-4 border-l-2 border-muted pl-6">
                {group.items.map(item => {
                  const style = getCategoryStyle(item.category);
                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      whileHover={{ x: 4 }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/30 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${style.text}`}>{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.time?.slice(0, 5).replace(":", "h")}
                          {item.duration && ` · ${item.duration}`}
                          {item.instructor && ` · ${item.instructor}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.spotsLeft !== undefined && item.spotsLeft <= 3 && (
                          <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            {item.spotsLeft} place{item.spotsLeft > 1 ? "s" : ""}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Aucune séance à venir pour cette catégorie</p>
          )}
        </div>
      </section>

      <AnimatePresence>
        {selectedItem && (
          <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
