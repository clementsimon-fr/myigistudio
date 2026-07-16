import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Euro, MapPin, Users, CalendarDays, ClipboardList, Clock, ChevronDown, CreditCard, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecurringGrid, MonthWorkshops } from "@/components/PlanningTypeView";
import { supabase } from "@/integrations/supabase/client";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";
import BookingSheet from "@/components/booking/BookingSheet";

const PLACEHOLDER_IMG = "/placeholder.svg";

interface ActivityDetailPanelProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
  workshop?: Workshop | null;
  schedules?: Schedule[];
  allCourses?: Course[];
  workshopsList?: Workshop[];
  instructorPhoto?: string;
  spotsLeft?: number;
  onBook?: () => void;
}

function getCategoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] || {
      block: "",
      dot: "",
      text: "text-primary-dark",
      bookBtn: "bg-primary hover:bg-primary/90 text-primary-foreground",
    }
  );
}

function MetaBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm overflow-hidden mb-4">
      <header className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display font-semibold text-sm text-primary-dark">{title}</h3>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function ActivityDetailPanel({
  open,
  onClose,
  course,
  workshop,
  schedules = [],
  allCourses = [],
  workshopsList = [],
  instructorPhoto,
  spotsLeft,
}: ActivityDetailPanelProps) {
  const [readMore, setReadMore] = useState(false);
  const [bookingStarted, setBookingStarted] = useState(false);
  const [yogaUnitPrice, setYogaUnitPrice] = useState<number | null>(null);
  const [cardsInfoOpen, setCardsInfoOpen] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setReadMore(false);
    setBookingStarted(false);
  }, [open, course?.id, workshop?.id]);

  useEffect(() => {
    if (bookingStarted) {
      requestAnimationFrame(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [bookingStarted]);

  // Bouton retour du téléphone / geste swipe-back : ferme le panneau au lieu de quitter la page.
  useBackNavigation(open, "panel", onClose);

  useEffect(() => {
    if (!open || !course) return;
    supabase
      .from("pricing_cards")
      .select("id, name, sessions, price, validity, popular, payment_info, sort_order")
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return;
        const unit = (data as any[]).find((d) => d.sessions === 1);
        if (unit) setYogaUnitPrice(unit.price);
      });
  }, [open, course]);

  const item = course || workshop;
  if (!item) return null;

  const category = item.category;
  const style = getCategoryStyle(category);
  const name = item.name;
  const image = item.image;
  const shortDesc = item.description || "";
  const longDesc = (item as any).long_description || shortDesc;
  const hasMore = longDesc && longDesc !== shortDesc && longDesc.length > shortDesc.length;
  const instructor: string | undefined = course?.instructor ?? (item as any).instructor;

  let tarifLabel = "—";
  if (workshop) {
    tarifLabel = workshop.price ? `${workshop.price} €` : "Gratuit";
  } else if (course) {
    tarifLabel = course.tariff_mode === "prix"
      ? `${course.price ?? 0} €`
      : (yogaUnitPrice !== null ? `${yogaUnitPrice} € ou 1 carte Yoga` : "1 carte Yoga");
  }

  const inclusions = workshop ? workshop.inclusions : course?.inclusions || schedules[0]?.inclusions;
  const complementaryInfo = workshop ? workshop.complementary_info : course?.complementary_info;

  const places =
    spotsLeft !== undefined
      ? `${spotsLeft} disponible${spotsLeft > 1 ? "s" : ""}`
      : `${(item as any).spots ?? "—"} max`;

  // Compute duration from first available schedule (course) or the workshop itself
  const computeDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h}h${m.toString().padStart(2, "0")}`;
    if (h) return `${h}h`;
    return `${m} min`;
  };
  const durationLabel = workshop
    ? computeDuration(workshop.time, workshop.end_time)
    : schedules[0]
    ? computeDuration(schedules[0].time, schedules[0].end_time)
    : null;

  const filteredCourses = course ? allCourses.filter((c) => c.id === course.id) : [];
  const filteredSchedules = course ? schedules.filter((s) => s.course_id === course.id) : [];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/40"
          onClick={onClose}
        >
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl"
          >
            <div className="relative h-56 flex-shrink-0">
              <img src={image || PLACEHOLDER_IMG} alt={name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 md:px-6 -mt-12 relative z-10 pb-8">
              <div className="max-w-2xl mx-auto">
                <Badge className={`${style.dot} text-white border-0 capitalize mb-3`}>
                  {category}
                </Badge>
                <h1 className={`text-2xl md:text-3xl font-display font-bold mb-3 ${style.text}`}>
                  {name}
                </h1>

                {longDesc && (
                  <div className="mb-6">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                      {readMore || !hasMore
                        ? longDesc
                        : shortDesc.length > 220
                        ? shortDesc.slice(0, 220) + "…"
                        : shortDesc}
                    </p>
                    {(hasMore || shortDesc.length > 220) && (
                      <button
                        onClick={() => setReadMore((r) => !r)}
                        className="mt-2 text-xs font-semibold text-primary hover:underline"
                      >
                        {readMore ? "Lire moins" : "Lire plus"}
                      </button>
                    )}
                  </div>
                )}

                {/* META-BLOC : En détail */}
                <MetaBlock icon={ClipboardList} title="En détail">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        <User className="h-3 w-3" /> Intervenant
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {instructorPhoto ? <AvatarImage src={instructorPhoto} alt={instructor} /> : null}
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {instructor?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{instructor || "—"}</span>
                      </div>
                    </div>
                    {course && course.tariff_mode !== "prix" ? (
                      <button
                        type="button"
                        onClick={() => setCardsInfoOpen(true)}
                        className="rounded-xl bg-muted/50 p-3 text-left hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                          <Euro className="h-3 w-3" /> Tarif
                        </div>
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          {tarifLabel}
                          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                        </div>
                        {inclusions && <div className="text-[11px] text-muted-foreground mt-1">✓ {inclusions}</div>}
                      </button>
                    ) : (
                      <div className="rounded-xl bg-muted/50 p-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                          <Euro className="h-3 w-3" /> Tarif
                        </div>
                        <div className="text-sm font-semibold">{tarifLabel}</div>
                        {inclusions && <div className="text-[11px] text-muted-foreground mt-1">✓ {inclusions}</div>}
                      </div>
                    )}
                    <div className="rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        <MapPin className="h-3 w-3" /> Lieu
                      </div>
                      <div className="text-sm font-medium">Studio MyIgi</div>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        <Users className="h-3 w-3" /> Places
                      </div>
                      <div className="text-sm font-medium">{places}</div>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3 col-span-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        <Clock className="h-3 w-3" /> Durée
                      </div>
                      <div className="text-sm font-medium">{durationLabel || "—"}</div>
                    </div>
                  </div>

                  {complementaryInfo && (
                    <div className="rounded-xl bg-muted/30 p-3 mb-2 text-sm text-foreground/80 whitespace-pre-line">
                      {complementaryInfo}
                    </div>
                  )}

                  {((course && filteredSchedules.length > 0) || (workshop && workshopsList.length > 0)) && (
                    <Collapsible className="pt-2 border-t">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="group mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          Voir le planning
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 space-y-3">
                        {course && filteredSchedules.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                              <CalendarDays className="h-3 w-3" /> Planning — récurrent
                            </div>
                            <RecurringGrid courses={filteredCourses} schedules={filteredSchedules} />
                          </div>
                        )}
                        {workshop && workshopsList.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                              <CalendarDays className="h-3 w-3" /> Planning — ponctuel
                            </div>
                            <MonthWorkshops workshops={workshopsList.filter((w) => w.name === workshop.name)} />
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </MetaBlock>

                {/* META-BLOC : Réservation — montée uniquement après clic sur "Réserver" */}
                {bookingStarted && (
                  <div ref={bookingRef}>
                    <BookingSheet
                      open={true}
                      onClose={onClose}
                      course={course}
                      workshop={workshop}
                      schedules={filteredSchedules}
                      workshopsList={workshopsList.filter((w) => !workshop || w.name === workshop.name)}
                      unitPrice={yogaUnitPrice}
                    />
                  </div>
                )}
              </div>
            </div>

            {!bookingStarted && (
              <div className="shrink-0 border-t bg-background p-3">
                <Button className="w-full gap-2" onClick={() => setBookingStarted(true)}>
                  <CreditCard className="h-4 w-4" /> Réserver
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Popup explicatif du principe des cartes (Yoga uniquement) */}
      <Dialog open={cardsInfoOpen} onOpenChange={setCardsInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Comment ça marche ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
            <p>
              Vous pouvez régler {yogaUnitPrice !== null ? `${yogaUnitPrice} € ` : ""}
              à l'unité pour ce cours, ou utiliser <strong>une carte Yoga</strong> déjà en votre possession.
            </p>
            <p>
              Une carte Yoga est un forfait de plusieurs séances acheté à l'avance (moins cher que le cours à
              l'unité), utilisable pour <strong>n'importe quel cours de yoga</strong> pendant sa durée de validité —
              vous réservez au fur et à mesure, quand vous le souhaitez.
            </p>
            <p className="text-muted-foreground text-xs">
              Retrouvez toutes les formules de cartes disponibles à l'étape "Vos achats" pendant votre réservation.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}
