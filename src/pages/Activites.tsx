import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Clock, Users, Euro, Calendar, Loader2, ChevronDown, ChevronUp, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import PricingSection from "@/components/home/PricingSection";
import TeamSection from "@/components/home/TeamSection";
import ActivityFilterBar, { type FilterCategory } from "@/components/ActivityFilterBar";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────
interface Schedule { day: string; time: string; end_time: string; spots: number; spots_left: number; }
interface Instructor { id: string; name: string; photo_url: string; }
interface Course { id: string; name: string; description: string; long_description: string; instructor: string; instructor_id: string | null; spots: number; spots_left: number; image: string; schedules: Schedule[]; }
interface Workshop { id: string; name: string; description: string; long_description: string; date: string; time: string; end_time: string; duration: string; frequency: string; price: number; spots: number; spots_left: number; image: string; category: string; instructor_id: string | null; }

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return "";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

const PLACEHOLDER_IMG = "/placeholder.svg";
const MAX_VISIBLE_SCHEDULES = 3;

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

export default function Activites() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [instructors, setInstructors] = useState<Record<string, Instructor>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [descriptionCourse, setDescriptionCourse] = useState<Course | null>(null);
  const [descriptionWs, setDescriptionWs] = useState<Workshop | null>(null);

  useEffect(() => {
    const load = async () => {
      const [coursesRes, schedulesRes, workshopsRes, instructorsRes] = await Promise.all([
        supabase.from("courses").select("*").eq("category", "yoga"),
        supabase.from("course_schedules").select("*"),
        supabase.from("workshops").select("*").order("date"),
        supabase.from("instructors").select("id, name, photo_url").eq("active", true),
      ]);
      const instrMap: Record<string, Instructor> = {};
      if (instructorsRes.data) for (const inst of instructorsRes.data) instrMap[inst.id] = inst;
      setInstructors(instrMap);

      const schedulesMap: Record<string, Schedule[]> = {};
      if (schedulesRes.data) for (const s of schedulesRes.data) {
        if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
        schedulesMap[s.course_id].push({ day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, spots_left: s.spots_left });
      }

      if (coursesRes.data) setCourses(coursesRes.data.map((c: any) => ({
        id: c.id, name: c.name, description: c.description || "", long_description: c.long_description || "",
        instructor: c.instructor, instructor_id: c.instructor_id || null, spots: c.spots, spots_left: c.spots_left,
        image: c.image || "",
        schedules: schedulesMap[c.id] || [{ day: c.day, time: c.time, end_time: c.end_time || "", spots: c.spots, spots_left: c.spots_left }],
      })));
      if (workshopsRes.data) setWorkshops(workshopsRes.data as unknown as Workshop[]);
      setLoading(false);
    };
    load();
  }, []);

  const toggleExpand = (id: string) => setExpandedCards(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const getInstructorPhoto = (instructorId: string | null, instructorName?: string): string | undefined => {
    if (instructorId && instructors[instructorId]?.photo_url) return instructors[instructorId].photo_url;
    if (instructorName) { const m = Object.values(instructors).find(i => i.name === instructorName); if (m?.photo_url) return m.photo_url; }
    return undefined;
  };

  const potteryWorkshops = workshops.filter(w => w.category === "poterie");
  const wellbeingWorkshops = workshops.filter(w => w.category === "bien-etre");

  const showYoga = filter === "all" || filter === "yoga";
  const showPoterie = filter === "all" || filter === "poterie";
  const showAteliers = filter === "all" || filter === "bien-etre";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden bg-secondary/30 py-16 md:py-24">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-sm font-medium uppercase tracking-widest text-primary-dark mb-4">Bienvenue chez</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl md:text-7xl font-display font-bold text-primary-dark mb-4 md:mb-6">
                MyIgi<span className="text-primary italic">Studio</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-base md:text-xl text-muted-foreground mb-8 md:mb-10 leading-relaxed px-4">
                Yoga, Pilates, Poterie & Bien-être.<br />Réservez vos cours et ateliers en quelques clics.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex justify-center">
                <Link to="/calendrier">
                  <Button size="lg" className="bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90 gap-2 px-8">
                    Planning & réservation <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── Sticky filters ─── */}
        <ActivityFilterBar filter={filter} onFilterChange={setFilter} />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {/* ─── Yoga & Pilates ─── */}
            {showYoga && courses.length > 0 && (
              <section className="py-12 md:py-16">
                <div className="container">
                  <h2 className="text-xl md:text-3xl font-display font-bold text-primary-dark mb-6 md:mb-8 text-center">Yoga & Pilates</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {courses.map((course, i) => {
                      const totalSpotsLeft = course.schedules.reduce((sum, s) => sum + s.spots_left, 0);
                      const isExpanded = expandedCards.has(course.id);
                      const hasMore = course.schedules.length > MAX_VISIBLE_SCHEDULES;
                      const visible = isExpanded ? course.schedules : course.schedules.slice(0, MAX_VISIBLE_SCHEDULES);
                      const photo = getInstructorPhoto(course.instructor_id, course.instructor);
                      return (
                        <motion.div key={course.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="aspect-[4/3] overflow-hidden bg-muted">
                            <img src={course.image || PLACEHOLDER_IMG} alt={course.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div className="p-4 md:p-5">
                            <h3 className="font-display font-semibold text-base md:text-lg text-primary-dark leading-tight mb-2">{course.name}</h3>
                            {course.description && <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>}
                            <div className="flex items-center gap-3 text-xs md:text-sm text-muted-foreground mb-3">
                              <InstructorBadge instructor={course.instructor} photo={photo} />
                            </div>
                            <div className="flex gap-2">
                              {(course.long_description || course.description) && (
                                <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => setDescriptionCourse(course)}>
                                  <Info className="h-3 w-3" /> Description
                                </Button>
                              )}
                              <Link to="/calendrier?filter=yoga" className="flex-1">
                                <Button size="sm" className="w-full text-xs">Réserver</Button>
                              </Link>
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
            {showPoterie && potteryWorkshops.length > 0 && (
              <section className={`py-12 md:py-16 ${showYoga && courses.length > 0 ? "bg-secondary/10" : ""}`}>
                <div className="container">
                  <h2 className="text-xl md:text-3xl font-display font-bold text-primary-dark mb-6 md:mb-8 text-center">Poterie</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {potteryWorkshops.map((ws, i) => (
                      <WorkshopCard key={ws.id} ws={ws} i={i} onDescription={setDescriptionWs} instructorPhoto={getInstructorPhoto(ws.instructor_id)} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ─── Ateliers & Stages ─── */}
            {showAteliers && wellbeingWorkshops.length > 0 && (
              <section className="py-12 md:py-16">
                <div className="container">
                  <h2 className="text-xl md:text-3xl font-display font-bold text-primary-dark mb-6 md:mb-8 text-center">Ateliers & Stages</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {wellbeingWorkshops.map((ws, i) => (
                      <WorkshopCard key={ws.id} ws={ws} i={i} onDescription={setDescriptionWs} instructorPhoto={getInstructorPhoto(ws.instructor_id)} />
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
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
          </div>
        </section>
      </main>
      <Footer />

      {/* Course description dialog */}
      <Dialog open={!!descriptionCourse} onOpenChange={(open) => !open && setDescriptionCourse(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {descriptionCourse && (
            <>
              <DialogHeader><DialogTitle className="font-display">{descriptionCourse.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <img src={descriptionCourse.image || PLACEHOLDER_IMG} alt={descriptionCourse.name} className="w-full rounded-lg object-cover max-h-64" />
                <div className="text-sm text-muted-foreground whitespace-pre-line">{descriptionCourse.long_description || descriptionCourse.description}</div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <InstructorBadge instructor={descriptionCourse.instructor} photo={getInstructorPhoto(descriptionCourse.instructor_id, descriptionCourse.instructor)} />
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {descriptionCourse.schedules[0]?.spots || descriptionCourse.spots} places max</div>
                </div>
                <Link to={`/reserver?type=course&id=${descriptionCourse.id}`}><Button className="w-full">Réserver</Button></Link>
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
                <Link to={`/reserver?type=workshop&id=${descriptionWs.id}`}><Button className="w-full">Réserver</Button></Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkshopCard({ ws, i, onDescription, instructorPhoto }: { ws: Workshop; i: number; onDescription: (w: Workshop) => void; instructorPhoto?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img src={ws.image || "/placeholder.svg"} alt={ws.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display font-semibold text-base md:text-lg text-primary-dark leading-tight">{ws.name}</h3>
          <Badge variant={ws.spots_left <= 2 ? "destructive" : "secondary"} className="text-[10px] md:text-xs shrink-0">
            {ws.spots_left} place{ws.spots_left > 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-3 line-clamp-2">{ws.description}</p>
        <div className="grid grid-cols-2 gap-1.5 text-xs md:text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(ws.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{ws.time}{ws.end_time ? `-${ws.end_time}` : ""}</div>
          <div className="flex items-center gap-1"><Users className="h-3 w-3" />{ws.spots} max</div>
          <div className="flex items-center gap-1"><Euro className="h-3 w-3" />{ws.price}€</div>
        </div>
        {ws.frequency && ws.frequency !== "ponctuel" && <Badge variant="outline" className="text-[10px] capitalize mb-2">{ws.frequency}</Badge>}
        <div className="flex gap-2">
          {(ws.long_description || ws.description) && (
            <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => onDescription(ws)}>
              <Info className="h-3 w-3" /> Description
            </Button>
          )}
          <Link to={`/reserver?type=workshop&id=${ws.id}`} className="flex-1">
            <Button size="sm" className="w-full text-xs">Réserver</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
