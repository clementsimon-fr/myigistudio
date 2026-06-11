import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Euro, MapPin, Users, Sparkles, CalendarDays, ClipboardList, Clock, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RecurringGrid, MonthWorkshops } from "@/components/PlanningTypeView";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";
import YogaFormulasBlock, { YogaFormulasPricingCard } from "@/components/YogaFormulasBlock";
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
  const [yogaUnitPrice, setYogaUnitPrice] = useState<number | null>(null);
  const [yogaCards, setYogaCards] = useState<YogaFormulasPricingCard[]>([]);

  useEffect(() => {
    if (!open) return;
    setReadMore(false);
  }, [open, course?.id, workshop?.id]);

  useEffect(() => {
    if (!open || !course) return;
    supabase
      .from("pricing_cards")
      .select("id, name, sessions, price, validity, popular, payment_info, sort_order")
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return;
        setYogaCards(data as unknown as YogaFormulasPricingCard[]);
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
    tarifLabel = yogaUnitPrice !== null ? `${yogaUnitPrice} € ou 1 carte Yoga` : "1 carte Yoga";
  }

  const places =
    spotsLeft !== undefined
      ? `${spotsLeft} disponible${spotsLeft > 1 ? "s" : ""}`
      : `${(item as any).spots ?? "—"} max`;

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
            className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
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
                    <div className="rounded-xl bg-muted/50 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        <Euro className="h-3 w-3" /> Tarif
                      </div>
                      <div className="text-sm font-semibold">{tarifLabel}</div>
                    </div>
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
                  </div>

                  {course && filteredSchedules.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-2 mt-2">
                        <CalendarDays className="h-3 w-3" /> Planning — récurrent
                      </div>
                      <RecurringGrid courses={filteredCourses} schedules={filteredSchedules} />
                    </div>
                  )}
                  {workshop && workshopsList.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-2 mt-2">
                        <CalendarDays className="h-3 w-3" /> Planning — ponctuel
                      </div>
                      <MonthWorkshops workshops={workshopsList.filter((w) => w.name === workshop.name)} />
                    </div>
                  )}
                </MetaBlock>

                {/* META-BLOC : Formules (yoga only) */}
                {course && yogaCards.length > 0 && (
                  <MetaBlock icon={Sparkles} title="Formules Cartes Yoga">
                    <YogaFormulasBlock pricingCards={yogaCards} showHeader={false} />
                  </MetaBlock>
                )}

                {/* META-BLOC : Réservation — always open */}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
