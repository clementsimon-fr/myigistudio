import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Info, Users, Euro, Clock, Mail, ChevronLeft, ChevronRight, Repeat, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PricingSection from "@/components/home/PricingSection";
import { RecurringGrid, MonthWorkshops } from "@/components/PlanningTypeView";
import ActivityDetailPanel from "@/components/ActivityDetailPanel";
import TeamSection from "@/components/home/TeamSection";
import ContactElodieButton from "@/components/ContactElodieButton";
import PotteryCalendar from "@/components/PotteryCalendar";
import { CATEGORY_STYLES, type FilterCategory } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PLACEHOLDER_IMG = "/placeholder.svg";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length <= 1) {
    return <img src={images[0] || PLACEHOLDER_IMG} alt={alt} className="w-full h-full object-cover" loading="lazy" />;
  }
  return (
    <div className="relative w-full h-full group">
      <img src={images[idx]} alt={alt} className="w-full h-full object-cover" loading="lazy" />
      <button
        onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + images.length) % images.length); }}
        className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
      >‹</button>
      <button
        onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % images.length); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
      >›</button>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}

interface ActivitiesViewProps {
  courses: Course[];
  workshops: Workshop[];
  schedules: Schedule[];
  filter: FilterCategory;
  subFilter?: string;
  getInstructorPhoto: (id: string | null, name?: string) => string | undefined;
  onSwitchToPlanning: (params?: { type: "course" | "workshop"; id: string; date?: string }) => void;
}

function InstructorBadge({ instructor, photo }: { instructor: string; photo?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="h-5 w-5">
        {photo ? <AvatarImage src={photo} alt={instructor} /> : null}
        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{instructor.charAt(0)}</AvatarFallback>
      </Avatar>
      <span>{instructor}</span>
    </div>
  );
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLES[category] || { block: "", dot: "", text: "text-primary-dark", bookBtn: "bg-primary hover:bg-primary/90 text-primary-foreground" };
}

function WeekDots({ activeDays, dotColor }: { activeDays: Set<string>; dotColor: string }) {
  return (
    <div className="flex items-center gap-1">
      {DAYS.map((day, i) => (
        <div
          key={day}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium ${
            activeDays.has(day) ? `${dotColor} text-white` : "bg-muted text-muted-foreground/50"
          }`}
          title={day}
        >
          {DAYS_SHORT[i]}
        </div>
      ))}
    </div>
  );
}

function isFutureDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T12:00:00");
  return d >= today;
}

function InterestForm({ activityName }: { activityName: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    await supabase.from("interest_emails" as any).insert({ email, activity_name: activityName } as any);
    setSubmitted(true);
    toast({ title: "Merci ! Vous serez informé(e) des prochaines dates." });
  };

  if (submitted) {
    return <p className="text-xs text-emerald-600 text-center">✓ Vous serez informé(e) des prochaines dates</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">
        Cet événement est passé. Restez informé(e) des prochaines dates !
      </p>
      <div className="flex gap-1.5">
        <Input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-8 text-xs flex-1"
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />
        <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSubmit}>
          <Mail className="h-3 w-3" /> M'informer
        </Button>
      </div>
    </div>
  );
}

function formatLinkedDates(dates: string[]): string {
  if (dates.length === 0) return "";
  const formatted = dates.map(d => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  });
  if (formatted.length === 1) return formatted[0];
  return formatted.slice(0, -1).join(", ") + " & " + formatted[formatted.length - 1];
}

interface WorkshopGroup {
  key: string;
  workshops: Workshop[];
  linkedDates: string[];
  isLinked: boolean;
}

function groupWorkshops(workshops: Workshop[]): WorkshopGroup[] {
  const byName: Record<string, Workshop[]> = {};
  for (const ws of workshops) {
    if (!byName[ws.name]) byName[ws.name] = [];
    if (!byName[ws.name].some(existing => existing.date === ws.date)) {
      byName[ws.name].push(ws);
    }
  }
  const groups: WorkshopGroup[] = [];
  for (const [, nameWs] of Object.entries(byName)) {
    const sorted = [...nameWs].sort((a, b) => a.date.localeCompare(b.date));
    const hasLinked = sorted.some(w => w.linked_group);
    groups.push({ key: sorted[0].id, workshops: sorted, linkedDates: sorted.map(w => w.date), isLinked: hasLinked });
  }
  return groups;
}

/** Spots badge component */
function SpotsBadge({ spotsLeft }: { spotsLeft: number }) {
  if (spotsLeft === 0) {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Complet</Badge>;
  }
  if (spotsLeft <= 3) {
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/50 text-destructive">
      {spotsLeft} place{spotsLeft > 1 ? "s" : ""} restante{spotsLeft > 1 ? "s" : ""}
    </Badge>;
  }
  return <Badge variant="outline" className="text-[10px] px-1.5 py-0">
    {spotsLeft} places restantes
  </Badge>;
}

function WorkshopCard({ group, i, onDescription, instructorPhoto, onBook }: {
  group: WorkshopGroup; i: number; onDescription: (w: Workshop) => void; instructorPhoto?: string;
  onBook: (group: WorkshopGroup) => void;
}) {
  const ws = group.workshops[0];
  const style = getCategoryStyle(ws.category);
  const futureDates = group.workshops.filter(w => isFutureDate(w.date));
  const hasFutureDate = futureDates.length > 0;
  const nextFuture = futureDates.sort((a, b) => a.date.localeCompare(b.date))[0];
  // Spots: use next future workshop's spots_left
  const spotsLeft = nextFuture?.spots_left ?? ws.spots_left;

  return (
    <motion.div id={`card-workshop-${ws.name}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <ImageCarousel images={[ws.image, ...(ws.images || [])].filter(Boolean)} alt={ws.name} />
      </div>
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`font-display font-semibold text-base md:text-lg leading-tight ${style.text}`}>{ws.name}</h3>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{ws.description}</p>
        {group.isLinked && futureDates.length > 0 && (
          <p className="text-xs text-primary font-medium mb-2 flex items-center gap-2 flex-wrap">
            <span>📅 {formatLinkedDates(futureDates.map(w => w.date))}</span>
            {hasFutureDate && <SpotsBadge spotsLeft={spotsLeft} />}
          </p>
        )}
        {!group.isLinked && hasFutureDate && nextFuture && (
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
            <span>📅 Prochaine date : {new Date(nextFuture.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {futureDates.length > 1 && <span className="text-primary font-medium"> · {futureDates.length} dates disponibles</span>}</span>
            <SpotsBadge spotsLeft={spotsLeft} />
          </p>
        )}
        <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mb-3">
          {instructorPhoto && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={instructorPhoto} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary">I</AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        {hasFutureDate ? (
          <Button size="sm" className={`w-full text-xs ${style.bookBtn}`} onClick={() => onDescription(ws)} disabled={spotsLeft === 0}>
            {spotsLeft === 0 ? "Complet" : "Découvrir et réserver"}
          </Button>
        ) : (
          <div className="space-y-2">
            {(ws.long_description || ws.description) && (
              <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => onDescription(ws)}>
                <Info className="h-3 w-3" /> Découvrir
              </Button>
            )}
            <InterestForm activityName={ws.name} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface YogaPricingCard { id: string; name: string; sessions: number; price: number; validity: string; popular: boolean; sort_order: number; payment_info?: string; }

function YogaPricingCardsMini({ cards }: { cards: YogaPricingCard[] }) {
  if (!cards.length) return null;
  const unit = cards.find(c => c.sessions === 1)?.price;
  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map(c => {
        const per = c.sessions > 0 && c.sessions < 9999 ? c.price / c.sessions : null;
        const discount = unit && per && c.sessions > 1 ? Math.round((1 - per / unit) * 100) : null;
        return (
          <div key={c.id} className={`rounded-lg border p-2.5 bg-card ${c.popular ? "border-primary-dark/60" : ""}`}>
            <p className="text-xs font-semibold text-primary-dark leading-tight">{c.name}</p>
            <p className="text-base font-bold text-foreground mt-1">{c.price}€</p>
            <p className="text-[10px] text-muted-foreground">
              {c.sessions >= 9999 ? "Illimité" : `${c.sessions} cours`} · {c.validity}
            </p>
            {per !== null && (
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground">{per.toFixed(2)}€/cours</span>
                {discount && discount > 0 && (
                  <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full bg-accent/15 text-accent-foreground border border-accent/30">-{discount}%</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ActivitiesView({ courses, workshops, schedules, filter, subFilter = "all", getInstructorPhoto, onSwitchToPlanning }: ActivitiesViewProps) {
  const [descriptionCourse, setDescriptionCourse] = useState<Course | null>(null);
  const [descriptionWs, setDescriptionWs] = useState<Workshop | null>(null);
  const [yogaMonthOffset, setYogaMonthOffset] = useState(0);
  const [potterySubFilter, setPotterySubFilter] = useState("all");
  const [yogaCards, setYogaCards] = useState<YogaPricingCard[]>([]);

  useEffect(() => {
    if (descriptionCourse && yogaCards.length === 0) {
      supabase.from("pricing_cards").select("*").order("sort_order").then(({ data }) => {
        if (data) setYogaCards(data as unknown as YogaPricingCard[]);
      });
    }
  }, [descriptionCourse, yogaCards.length]);

  const yogaMonthDate = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + yogaMonthOffset); return d; }, [yogaMonthOffset]);
  const yogaMonthLabel = yogaMonthDate.toLocaleDateString("fr-FR", { month: "long" });

  const handleProgrammeEventClick = useCallback((params: { type: "course" | "workshop"; name: string; id?: string; date?: string }) => {
    if (params.type === "workshop") {
      const ws = workshops.find(w => (params.id && w.id === params.id) || (w.name === params.name && (!params.date || w.date === params.date)));
      if (ws) { setDescriptionWs(ws); return; }
    } else {
      const c = courses.find(c => (params.id && c.id === params.id) || c.name === params.name);
      if (c) { setDescriptionCourse(c); return; }
    }
    // fallback: scroll to card if not found
    const cardId = params.type === "course" ? `card-course-${params.id}` : `card-workshop-${params.name}`;
    const el = document.getElementById(cardId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [workshops, courses]);

  const schedulesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const s of schedules) {
      if (!map[s.course_id]) map[s.course_id] = new Set();
      map[s.course_id].add(s.day);
    }
    return map;
  }, [schedules]);

  const coursesWithSchedules = useMemo(() => {
    return courses.filter(c => c.category === "yoga")
      .filter(c => subFilter === "all" || c.name === subFilter)
      .map(c => ({
        ...c,
        schedules: schedules.filter(s => s.course_id === c.id),
        activeDays: schedulesMap[c.id] || new Set<string>(),
      }));
  }, [courses, schedules, schedulesMap, subFilter]);

  const potteryGroups = useMemo(() => groupWorkshops(workshops.filter(w => w.category === "poterie" && (potterySubFilter === "all" || w.name === potterySubFilter))), [workshops, potterySubFilter]);

  const showYoga = filter === "all" || filter === "yoga";
  const showPoterie = filter === "all" || filter === "poterie";

  const yogaStyle = getCategoryStyle("yoga");
  const potteryStyle = getCategoryStyle("poterie");

  const handleBookCourse = (course: Course) => {
    setDescriptionCourse(course);
  };

  const handleBookGroup = (group: WorkshopGroup) => {
    setDescriptionWs(group.workshops[0]);
  };

  const handleBookPotterySlot = (ws: Workshop) => {
    setDescriptionWs(ws);
  };

  // descriptionCourseDays removed — "Jours de la semaine" block dropped per #2

  // Compute min spots_left for each yoga course from its schedules
  const getCourseSpotsLeft = (courseId: string) => {
    const courseSchedules = schedules.filter(s => s.course_id === courseId);
    if (courseSchedules.length === 0) return undefined;
    return Math.min(...courseSchedules.map(s => s.spots_left));
  };

  const yogaWorkshopsForMonth = useMemo(
    () => workshops.filter(w => w.category === "yoga" && (subFilter === "all" || w.name === subFilter)),
    [workshops, subFilter]
  );
  const hasRecurring = showYoga && coursesWithSchedules.length > 0;
  const hasPonctuelYoga = showYoga && yogaWorkshopsForMonth.length > 0;

  return (
    <>
      {/* ─── Meta-bloc : Événements récurrents ─── */}
      {hasRecurring && (
        <section className="py-6 md:py-8 border-b bg-muted/20" data-planning-section>
          <div className="container max-w-5xl">
            <div className="flex items-center gap-2 mb-4 md:mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
                <Repeat className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-primary-dark leading-tight">Événements récurrents</h2>
                <p className="text-xs text-muted-foreground">Les cours hebdomadaires de Yoga & Pilates</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <button onClick={() => setYogaMonthOffset(o => o - 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4 text-muted-foreground" /></button>
              <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground capitalize">
                Planning de {yogaMonthLabel}
              </h3>
              <button onClick={() => setYogaMonthOffset(o => o + 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="max-w-2xl mx-auto">
              <RecurringGrid courses={courses.filter(c => c.category === "yoga" && (subFilter === "all" || c.name === subFilter))} schedules={schedules} onEventClick={handleProgrammeEventClick} />
            </div>
          </div>
        </section>
      )}

      {/* ─── Meta-bloc : Événements ponctuels ─── */}
      {(hasPonctuelYoga || showPoterie) && (
        <section className="py-6 md:py-8 border-b bg-card">
          <div className="container max-w-5xl">
            <div className="flex items-center gap-2 mb-4 md:mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent/15 text-accent-foreground">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-lg md:text-xl font-bold text-primary-dark leading-tight">Événements ponctuels</h2>
                <p className="text-xs text-muted-foreground">Ateliers, stages et dates uniques</p>
              </div>
            </div>
            {hasPonctuelYoga && (
              <div className="max-w-2xl mx-auto mb-6">
                <MonthWorkshops workshops={yogaWorkshopsForMonth} onEventClick={handleProgrammeEventClick} hideTitle hidePriceSpots monthDate={yogaMonthDate} hideEmptyMessage />
              </div>
            )}
            {showPoterie && (
              <div className="max-w-lg mx-auto">
                <PotteryCalendar
                  workshops={workshops}
                  subFilter={potterySubFilter}
                  onSubFilterChange={setPotterySubFilter}
                  onBook={handleBookPotterySlot}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── Découvrir Yoga & Pilates ─── */}
      {showYoga && coursesWithSchedules.length > 0 && (
        <section className="py-8 md:py-10">
          <div className="container">
            <h2 className={`text-xl md:text-2xl font-display font-bold mb-5 md:mb-6 text-center ${yogaStyle.text}`}>Yoga & Pilates</h2>
            <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground mb-4 text-center">Découvrir</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {coursesWithSchedules.map((course, i) => {
                const photo = getInstructorPhoto(course.instructor_id, course.instructor);
                const spotsLeft = getCourseSpotsLeft(course.id);
                const nextDate = (() => {
                  const today = new Date();
                  const dayIdx = today.getDay();
                  const dayMap: Record<string, number> = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0 };
                  let minDiff = Infinity;
                  for (const d of course.activeDays) {
                    const target = dayMap[d];
                    if (target === undefined) continue;
                    let diff = target - dayIdx;
                    if (diff < 0) diff += 7;
                    if (diff === 0) diff = 0;
                    if (diff < minDiff) minDiff = diff;
                  }
                  if (minDiff === Infinity) return null;
                  const next = new Date(today);
                  next.setDate(today.getDate() + minDiff);
                  return next;
                })();
                return (
                  <motion.div id={`card-course-${course.id}`} key={course.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all">
                    <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                      <ImageCarousel images={[course.image, ...(course.images || [])].filter(Boolean)} alt={course.name} />
                    </div>
                    <div className="p-4 md:p-5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className={`font-display font-semibold text-base md:text-lg leading-tight ${yogaStyle.text}`}>{course.name}</h3>
                      </div>
                      {course.description && <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>}
                      {nextDate && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2 flex-wrap">
                          <span>📅 Prochain cours : {nextDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
                          {spotsLeft !== undefined && <SpotsBadge spotsLeft={spotsLeft} />}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mb-3">
                        <InstructorBadge instructor={course.instructor} photo={photo} />
                      </div>
                      <Button size="sm" className={`w-full text-xs ${yogaStyle.bookBtn}`} onClick={() => setDescriptionCourse(course)} disabled={spotsLeft === 0}>
                        {spotsLeft === 0 ? "Complet" : "Découvrir et réserver"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Découvrir Poterie ─── */}
      {showPoterie && (
        <section className={`py-8 md:py-10 ${showYoga && coursesWithSchedules.length > 0 ? "bg-secondary/10" : ""}`}>
          <div className="container">
            <h2 className={`text-xl md:text-2xl font-display font-bold mb-5 md:mb-6 text-center ${potteryStyle.text}`}>Poterie</h2>
            <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground mb-4 text-center">Découvrir</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {potteryGroups.map((group, i) => (
                <WorkshopCard key={group.key} group={group} i={i} onDescription={setDescriptionWs} instructorPhoto={getInstructorPhoto(group.workshops[0].instructor_id)} onBook={handleBookGroup} />
              ))}
            </div>
          </div>
        </section>
      )}

      {(filter === "all" || filter === "yoga") && <PricingSection />}
      <TeamSection />

      <section className="py-12 md:py-16">
        <div className="container max-w-2xl text-center">
          <h2 className="text-xl md:text-2xl font-display font-bold text-primary-dark mb-4">Infos Pratiques</h2>
          <div className="space-y-3 text-muted-foreground text-sm">
            <p>Arrivez 10 minutes avant le cours · Tapis fournis · Tenue confortable</p>
            <p>Annulation gratuite jusqu'à 24h avant le cours. Au-delà, le crédit est débité.</p>
          </div>
          <div className="mt-4">
            <ContactElodieButton variant="outline" />
          </div>
        </div>
      </section>

      {/* Activity detail slide-up panel — courses */}
      <ActivityDetailPanel
        open={!!descriptionCourse}
        onClose={() => setDescriptionCourse(null)}
        course={descriptionCourse}
        schedules={schedules}
        allCourses={courses}
        instructorPhoto={descriptionCourse ? getInstructorPhoto(descriptionCourse.instructor_id, descriptionCourse.instructor) : undefined}
        spotsLeft={descriptionCourse ? getCourseSpotsLeft(descriptionCourse.id) : undefined}
        onBook={() => descriptionCourse && handleBookCourse(descriptionCourse)}
      />

      {/* Activity detail slide-up panel — workshops */}
      <ActivityDetailPanel
        open={!!descriptionWs}
        onClose={() => setDescriptionWs(null)}
        workshop={descriptionWs}
        workshopsList={workshops}
        instructorPhoto={descriptionWs ? getInstructorPhoto(descriptionWs.instructor_id) : undefined}
        spotsLeft={descriptionWs?.spots_left}
        onBook={() => descriptionWs && isFutureDate(descriptionWs.date) && handleBookGroup({ key: descriptionWs.id, workshops: [descriptionWs], linkedDates: [descriptionWs.date], isLinked: false })}
      />
    </>
  );
}
