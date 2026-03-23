import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Info, Users, Euro, Clock, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PricingSection from "@/components/home/PricingSection";
import { RecurringGrid, MonthWorkshops } from "@/components/PlanningTypeView";
import TeamSection from "@/components/home/TeamSection";
import ContactElodieButton from "@/components/ContactElodieButton";
import { CATEGORY_STYLES, type FilterCategory } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PLACEHOLDER_IMG = "/placeholder.svg";
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

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

/** Check if a workshop has a future date */
function isFutureDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T12:00:00");
  return d >= today;
}

/** Email interest form for past events */
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

/** Format linked dates nicely */
function formatLinkedDates(dates: string[]): string {
  if (dates.length === 0) return "";
  const formatted = dates.map(d => {
    const date = new Date(d + "T12:00:00");
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  });
  if (formatted.length === 1) return formatted[0];
  return formatted.slice(0, -1).join(", ") + " & " + formatted[formatted.length - 1];
}

/** Group workshops: linked_group workshops shown as single card */
interface WorkshopGroup {
  key: string;
  workshops: Workshop[];
  linkedDates: string[];
  isLinked: boolean;
}

function groupWorkshops(workshops: Workshop[]): WorkshopGroup[] {
  // Group ALL workshops by name → single card per activity name
  const byName: Record<string, Workshop[]> = {};

  for (const ws of workshops) {
    if (!byName[ws.name]) byName[ws.name] = [];
    // Dedupe by date
    if (!byName[ws.name].some(existing => existing.date === ws.date)) {
      byName[ws.name].push(ws);
    }
  }

  const groups: WorkshopGroup[] = [];

  for (const [, nameWs] of Object.entries(byName)) {
    const sorted = [...nameWs].sort((a, b) => a.date.localeCompare(b.date));
    // Check if any have a linked_group
    const hasLinked = sorted.some(w => w.linked_group);
    groups.push({
      key: sorted[0].id,
      workshops: sorted,
      linkedDates: sorted.map(w => w.date),
      isLinked: hasLinked,
    });
  }

  return groups;
}

function WorkshopCard({ group, i, onDescription, instructorPhoto, onBook }: {
  group: WorkshopGroup; i: number; onDescription: (w: Workshop) => void; instructorPhoto?: string;
  onBook: (group: WorkshopGroup) => void;
}) {
  const ws = group.workshops[0]; // Use first workshop for metadata
  const style = getCategoryStyle(ws.category);
  const futureDates = group.workshops.filter(w => isFutureDate(w.date));
  const hasFutureDate = futureDates.length > 0;

  // For non-linked groups with multiple dates, show next date + count
  const nextFuture = futureDates.sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <motion.div id={`card-workshop-${ws.name}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img src={ws.image || PLACEHOLDER_IMG} alt={ws.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="p-4 md:p-5">
        <h3 className={`font-display font-semibold text-base md:text-lg leading-tight mb-2 ${style.text}`}>{ws.name}</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{ws.description}</p>
        {group.isLinked && futureDates.length > 0 && (
          <p className="text-xs text-primary font-medium mb-2">
            📅 {formatLinkedDates(futureDates.map(w => w.date))}
          </p>
        )}
        {!group.isLinked && hasFutureDate && nextFuture && (
          <p className="text-xs text-muted-foreground mb-2">
            📅 Prochaine date : {new Date(nextFuture.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            {futureDates.length > 1 && <span className="text-primary font-medium"> · {futureDates.length} dates disponibles</span>}
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
          <div className="flex gap-2">
            {(ws.long_description || ws.description) && (
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => onDescription(ws)}>
                <Info className="h-3 w-3" /> Description
              </Button>
            )}
            <Button size="sm" className={`flex-1 text-xs ${style.bookBtn}`} onClick={() => onBook(group)}>Réserver</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              {(ws.long_description || ws.description) && (
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => onDescription(ws)}>
                  <Info className="h-3 w-3" /> Description
                </Button>
              )}
            </div>
            <InterestForm activityName={ws.name} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ActivitiesView({ courses, workshops, schedules, filter, subFilter = "all", getInstructorPhoto, onSwitchToPlanning }: ActivitiesViewProps) {
  const [descriptionCourse, setDescriptionCourse] = useState<Course | null>(null);
  const [descriptionWs, setDescriptionWs] = useState<Workshop | null>(null);
  const [yogaMonthOffset, setYogaMonthOffset] = useState(0);
  const [potteryMonthOffset, setPotteryMonthOffset] = useState(0);
  const [atelierMonthOffset, setAtelierMonthOffset] = useState(0);

  const yogaMonthDate = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + yogaMonthOffset); return d; }, [yogaMonthOffset]);
  const potteryMonthDate = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + potteryMonthOffset); return d; }, [potteryMonthOffset]);
  const atelierMonthDate = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + atelierMonthOffset); return d; }, [atelierMonthOffset]);
  const yogaMonthLabel = yogaMonthDate.toLocaleDateString("fr-FR", { month: "long" });
  const potteryMonthLabel = potteryMonthDate.toLocaleDateString("fr-FR", { month: "long" });
  const atelierMonthLabel = atelierMonthDate.toLocaleDateString("fr-FR", { month: "long" });

  const handleProgrammeEventClick = useCallback((params: { type: "course" | "workshop"; name: string; id?: string; date?: string }) => {
    const cardId = params.type === "course" ? `card-course-${params.id}` : `card-workshop-${params.name}`;
    const el = document.getElementById(cardId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "ring-offset-2");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }, 500);
    }
  }, []);

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

  const potteryGroups = useMemo(() => groupWorkshops(workshops.filter(w => w.category === "poterie" && (subFilter === "all" || w.name === subFilter))), [workshops, subFilter]);
  const wellbeingGroups = useMemo(() => groupWorkshops(workshops.filter(w => w.category === "bien-etre" && (subFilter === "all" || w.name === subFilter))), [workshops, subFilter]);

  const showYoga = filter === "all" || filter === "yoga";
  const showPoterie = filter === "all" || filter === "poterie";
  const showAteliers = filter === "all" || filter === "bien-etre";

  const yogaStyle = getCategoryStyle("yoga");
  const potteryStyle = getCategoryStyle("poterie");

  const handleBookCourse = (course: Course) => {
    onSwitchToPlanning({ type: "course", id: course.id });
  };

  const handleBookGroup = (group: WorkshopGroup) => {
    if (group.isLinked) {
      const ws = group.workshops[0];
      onSwitchToPlanning({ type: "workshop", id: ws.id, date: ws.date });
    } else {
      const ws = group.workshops[0];
      const urlParams = new URLSearchParams();
      urlParams.set("type", "workshop");
      urlParams.set("name", ws.name);
      window.location.href = `/reserver?${urlParams.toString()}`;
    }
  };


  const descriptionCourseDays = descriptionCourse ? (schedulesMap[descriptionCourse.id] || new Set<string>()) : new Set<string>();

  return (
    <>
      {/* ─── Yoga & Pilates ─── */}

      {/* ─── Yoga & Pilates ─── */}
      {showYoga && coursesWithSchedules.length > 0 && (
        <section className="py-12 md:py-16" data-planning-section>
          <div className="container">
            <h2 className={`text-xl md:text-3xl font-display font-bold mb-6 md:mb-8 text-center ${yogaStyle.text}`}>Yoga & Pilates</h2>
            <div className="flex items-center justify-center gap-2 mb-3">
              <button onClick={() => setYogaMonthOffset(o => o - 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4 text-muted-foreground" /></button>
              <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground">
                Planning du mois de {yogaMonthLabel}
              </h3>
              <button onClick={() => setYogaMonthOffset(o => o + 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="mb-8 max-w-2xl mx-auto">
              <RecurringGrid courses={courses.filter(c => c.category === "yoga" && (subFilter === "all" || c.name === subFilter))} schedules={schedules} onEventClick={handleProgrammeEventClick} />
              {(() => {
                const yogaWs = workshops.filter(w => w.category === "yoga" && (subFilter === "all" || w.name === subFilter));
                const hasYogaWsThisMonth = yogaWs.length > 0;
                if (!hasYogaWsThisMonth) return null;
                return (
                  <div className="mt-4">
                    <MonthWorkshops workshops={yogaWs} onEventClick={handleProgrammeEventClick} hideTitle hidePriceSpots monthDate={yogaMonthDate} hideEmptyMessage />
                  </div>
                );
              })()}
            </div>
            <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground mb-4 text-center">Découvrir</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {coursesWithSchedules.map((course, i) => {
                const photo = getInstructorPhoto(course.instructor_id, course.instructor);
                // Compute next session date from schedule days
                const nextDate = (() => {
                  const today = new Date();
                  const dayIdx = today.getDay(); // 0=Sun
                  const dayMap: Record<string, number> = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 0 };
                  let minDiff = Infinity;
                  for (const d of course.activeDays) {
                    const target = dayMap[d];
                    if (target === undefined) continue;
                    let diff = target - dayIdx;
                    if (diff < 0) diff += 7;
                    if (diff === 0) diff = 0; // today
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
                      <img src={course.image || PLACEHOLDER_IMG} alt={course.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-4 md:p-5">
                      <h3 className={`font-display font-semibold text-base md:text-lg leading-tight mb-2 ${yogaStyle.text}`}>{course.name}</h3>
                      {course.description && <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>}
                      {nextDate && (
                        <p className="text-xs text-muted-foreground mb-2">
                          📅 Prochain cours : {nextDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mb-3">
                        <InstructorBadge instructor={course.instructor} photo={photo} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => setDescriptionCourse(course)}>
                          <Info className="h-3 w-3" /> Description
                        </Button>
                        <Button size="sm" className={`flex-1 text-xs ${yogaStyle.bookBtn}`} onClick={() => handleBookCourse(course)}>Réserver</Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Poterie ─── */}
      {showPoterie && potteryGroups.length > 0 && (
        <section className={`py-12 md:py-16 ${showYoga && coursesWithSchedules.length > 0 ? "bg-secondary/10" : ""}`}>
          <div className="container">
            <h2 className={`text-xl md:text-3xl font-display font-bold mb-6 md:mb-8 text-center ${potteryStyle.text}`}>Poterie</h2>
            <div className="flex items-center justify-center gap-2 mb-3">
              <button onClick={() => setPotteryMonthOffset(o => o - 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4 text-muted-foreground" /></button>
              <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground">
                Planning du mois de {potteryMonthLabel}
              </h3>
              <button onClick={() => setPotteryMonthOffset(o => o + 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="mb-8 max-w-2xl mx-auto">
              <MonthWorkshops workshops={workshops.filter(w => w.category === "poterie" && (subFilter === "all" || w.name === subFilter))} onEventClick={handleProgrammeEventClick} hideTitle hidePriceSpots monthDate={potteryMonthDate} />
            </div>
            <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground mb-4 text-center">Découvrir</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {potteryGroups.map((group, i) => (
                <WorkshopCard key={group.key} group={group} i={i} onDescription={setDescriptionWs} instructorPhoto={getInstructorPhoto(group.workshops[0].instructor_id)} onBook={handleBookGroup} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Ateliers & Stages ─── */}
      {showAteliers && wellbeingGroups.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className={`text-xl md:text-3xl font-display font-bold mb-6 md:mb-8 text-center ${getCategoryStyle("bien-etre").text}`}>Ateliers & Stages</h2>
            <div className="flex items-center justify-center gap-2 mb-3">
              <button onClick={() => setAtelierMonthOffset(o => o - 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronLeft className="h-4 w-4 text-muted-foreground" /></button>
              <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground">
                Planning du mois de {atelierMonthLabel}
              </h3>
              <button onClick={() => setAtelierMonthOffset(o => o + 1)} className="p-1 rounded-full hover:bg-muted transition-colors"><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="mb-8 max-w-2xl mx-auto">
              <MonthWorkshops workshops={workshops.filter(w => w.category === "bien-etre" && (subFilter === "all" || w.name === subFilter))} onEventClick={handleProgrammeEventClick} hideTitle hidePriceSpots monthDate={atelierMonthDate} />
            </div>
            <h3 className="text-sm md:text-base font-display font-semibold text-muted-foreground mb-4 text-center">Découvrir</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {wellbeingGroups.map((group, i) => (
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

      {/* Course description dialog */}
      <Dialog open={!!descriptionCourse} onOpenChange={(open) => !open && setDescriptionCourse(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {descriptionCourse && (
            <>
              <DialogHeader><DialogTitle className="font-display">{descriptionCourse.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <img src={descriptionCourse.image || PLACEHOLDER_IMG} alt={descriptionCourse.name} className="w-full rounded-lg object-cover max-h-64" />
                <div className="text-sm text-muted-foreground whitespace-pre-line">{descriptionCourse.long_description || descriptionCourse.description}</div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Jours de la semaine</p>
                  <WeekDots activeDays={descriptionCourseDays} dotColor={yogaStyle.dot} />
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <InstructorBadge instructor={descriptionCourse.instructor} photo={getInstructorPhoto(descriptionCourse.instructor_id, descriptionCourse.instructor)} />
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {descriptionCourse.spots} places max</div>
                </div>
                <Button className={`w-full ${yogaStyle.bookBtn}`} onClick={() => { setDescriptionCourse(null); handleBookCourse(descriptionCourse); }}>Réserver</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Workshop description dialog */}
      <Dialog open={!!descriptionWs} onOpenChange={(open) => !open && setDescriptionWs(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {descriptionWs && (
            <>
              <DialogHeader><DialogTitle className="font-display">{descriptionWs.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <img src={descriptionWs.image || PLACEHOLDER_IMG} alt={descriptionWs.name} className="w-full rounded-lg object-cover max-h-64" />
                <div className="text-sm text-muted-foreground whitespace-pre-line">{descriptionWs.long_description || descriptionWs.description}</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Euro className="h-3.5 w-3.5" /> {descriptionWs.price}€</div>
                  <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {descriptionWs.duration}</div>
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {descriptionWs.spots} places max</div>
                </div>
                {isFutureDate(descriptionWs.date) ? (
                  <Button className={`w-full ${getCategoryStyle(descriptionWs.category).bookBtn}`} onClick={() => { const ws = descriptionWs; setDescriptionWs(null); handleBookGroup({ key: ws.id, workshops: [ws], linkedDates: [ws.date], isLinked: false }); }}>Réserver</Button>
                ) : (
                  <InterestForm activityName={descriptionWs.name} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
