import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Info, Users, Euro, Clock, CalendarRange, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PricingSection from "@/components/home/PricingSection";
import TeamSection from "@/components/home/TeamSection";
import ContactElodieButton from "@/components/ContactElodieButton";
import FrequencyDialog from "@/components/FrequencyDialog";
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
  getInstructorPhoto: (id: string | null, name?: string) => string | undefined;
  onSwitchToPlanning: (params?: { filter?: FilterCategory; activity?: string; date?: string }) => void;
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
  const linkedGroups: Record<string, Workshop[]> = {};
  const standalone: Workshop[] = [];
  
  for (const ws of workshops) {
    if (ws.linked_group) {
      if (!linkedGroups[ws.linked_group]) linkedGroups[ws.linked_group] = [];
      linkedGroups[ws.linked_group].push(ws);
    } else {
      standalone.push(ws);
    }
  }

  const groups: WorkshopGroup[] = [];
  
  // Add linked groups
  for (const [groupId, gws] of Object.entries(linkedGroups)) {
    const sortedWs = [...gws].sort((a, b) => a.date.localeCompare(b.date));
    groups.push({
      key: groupId,
      workshops: sortedWs,
      linkedDates: sortedWs.map(w => w.date),
      isLinked: true,
    });
  }
  
  // Add standalone workshops
  for (const ws of standalone) {
    groups.push({
      key: ws.id,
      workshops: [ws],
      linkedDates: [ws.date],
      isLinked: false,
    });
  }

  return groups;
}

function WorkshopCard({ group, i, onDescription, instructorPhoto, onBook, onFrequency }: {
  group: WorkshopGroup; i: number; onDescription: (w: Workshop) => void; instructorPhoto?: string;
  onBook: (group: WorkshopGroup) => void; onFrequency: () => void;
}) {
  const ws = group.workshops[0]; // Use first workshop for metadata
  const style = getCategoryStyle(ws.category);
  const hasFutureDate = group.workshops.some(w => isFutureDate(w.date));
  const spotsLeft = Math.min(...group.workshops.map(w => w.spots_left));

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
        <img src={ws.image || PLACEHOLDER_IMG} alt={ws.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="p-4 md:p-5">
        <h3 className={`font-display font-semibold text-base md:text-lg leading-tight mb-2 ${style.text}`}>{ws.name}</h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{ws.description}</p>
        {group.isLinked && (
          <p className="text-xs text-primary font-medium mb-2">
            📅 {formatLinkedDates(group.linkedDates)}
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
          {spotsLeft <= 3 && spotsLeft > 0 && (
            <span className="text-amber-600 font-medium">Plus que {spotsLeft} place{spotsLeft > 1 ? "s" : ""}</span>
          )}
        </div>
        {hasFutureDate ? (
          <div className="flex gap-2">
            {(ws.long_description || ws.description) && (
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => onDescription(ws)}>
                <Info className="h-3 w-3" /> Description
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={onFrequency}>
              <CalendarRange className="h-3 w-3" />
            </Button>
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
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={onFrequency}>
                <CalendarRange className="h-3 w-3" />
              </Button>
            </div>
            <InterestForm activityName={ws.name} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ActivitiesView({ courses, workshops, schedules, filter, getInstructorPhoto, onSwitchToPlanning }: ActivitiesViewProps) {
  const [descriptionCourse, setDescriptionCourse] = useState<Course | null>(null);
  const [descriptionWs, setDescriptionWs] = useState<Workshop | null>(null);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [frequencyCategory, setFrequencyCategory] = useState<string>("yoga");
  const [frequencyActivity, setFrequencyActivity] = useState<string | undefined>(undefined);

  const schedulesMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const s of schedules) {
      if (!map[s.course_id]) map[s.course_id] = new Set();
      map[s.course_id].add(s.day);
    }
    return map;
  }, [schedules]);

  const coursesWithSchedules = useMemo(() => {
    return courses.filter(c => c.category === "yoga").map(c => ({
      ...c,
      schedules: schedules.filter(s => s.course_id === c.id),
      activeDays: schedulesMap[c.id] || new Set<string>(),
    }));
  }, [courses, schedules, schedulesMap]);

  const potteryGroups = useMemo(() => groupWorkshops(workshops.filter(w => w.category === "poterie")), [workshops]);
  const wellbeingGroups = useMemo(() => groupWorkshops(workshops.filter(w => w.category === "bien-etre")), [workshops]);

  const showYoga = filter === "all" || filter === "yoga";
  const showPoterie = filter === "all" || filter === "poterie";
  const showAteliers = filter === "all" || filter === "bien-etre";

  const yogaStyle = getCategoryStyle("yoga");
  const potteryStyle = getCategoryStyle("poterie");

  const handleBookCourse = (course: Course) => {
    onSwitchToPlanning({ filter: "yoga", activity: course.name });
  };

  const handleBookGroup = (group: WorkshopGroup) => {
    const ws = group.workshops[0];
    // For linked groups, pass the first workshop's date and linked_group info
    const params: any = { filter: ws.category as FilterCategory, activity: ws.name, date: ws.date };
    if (group.isLinked) {
      // Pass linked_group as query param so Reserver knows to load all linked workshops
      params.linkedGroup = group.workshops[0].linked_group;
    }
    onSwitchToPlanning(params);
  };

  const openFrequency = (category: string, activityName?: string) => {
    setFrequencyCategory(category);
    setFrequencyActivity(activityName);
    setFrequencyOpen(true);
  };

  const handleFrequencyTimeClick = (params: { activity: string; category: string; date?: string }) => {
    setFrequencyOpen(false);
    onSwitchToPlanning({
      filter: params.category as FilterCategory,
      activity: params.activity,
      date: params.date,
    });
  };

  const descriptionCourseDays = descriptionCourse ? (schedulesMap[descriptionCourse.id] || new Set<string>()) : new Set<string>();

  return (
    <>
      {/* ─── Yoga & Pilates ─── */}
      {showYoga && coursesWithSchedules.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className={`text-xl md:text-3xl font-display font-bold mb-6 md:mb-8 text-center ${yogaStyle.text}`}>Yoga & Pilates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {coursesWithSchedules.map((course, i) => {
                const photo = getInstructorPhoto(course.instructor_id, course.instructor);
                return (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                      <img src={course.image || PLACEHOLDER_IMG} alt={course.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-4 md:p-5">
                      <h3 className={`font-display font-semibold text-base md:text-lg leading-tight mb-2 ${yogaStyle.text}`}>{course.name}</h3>
                      {course.description && <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>}
                      <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mb-3">
                        <InstructorBadge instructor={course.instructor} photo={photo} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => setDescriptionCourse(course)}>
                          <Info className="h-3 w-3" /> Description
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => openFrequency("yoga", course.name)}>
                          <CalendarRange className="h-3 w-3" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {potteryGroups.map((group, i) => (
                <WorkshopCard key={group.key} group={group} i={i} onDescription={setDescriptionWs} instructorPhoto={getInstructorPhoto(group.workshops[0].instructor_id)} onBook={handleBookGroup} onFrequency={() => openFrequency("poterie", group.workshops[0].name)} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {wellbeingGroups.map((group, i) => (
                <WorkshopCard key={group.key} group={group} i={i} onDescription={setDescriptionWs} instructorPhoto={getInstructorPhoto(group.workshops[0].instructor_id)} onBook={handleBookGroup} onFrequency={() => openFrequency("bien-etre", group.workshops[0].name)} />
              ))}
            </div>
          </div>
        </section>
      )}

      <PricingSection />
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
                  <Button className={`w-full ${getCategoryStyle(descriptionWs.category).bookBtn}`} onClick={() => { const ws = descriptionWs; setDescriptionWs(null); handleBookWorkshop(ws); }}>Réserver</Button>
                ) : (
                  <InterestForm activityName={descriptionWs.name} />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Frequency dialog */}
      <FrequencyDialog
        open={frequencyOpen}
        onOpenChange={setFrequencyOpen}
        courses={courses}
        workshops={workshops}
        schedules={schedules}
        highlightCategory={frequencyCategory}
        specificActivity={frequencyActivity}
        onTimeClick={handleFrequencyTimeClick}
      />
    </>
  );
}
