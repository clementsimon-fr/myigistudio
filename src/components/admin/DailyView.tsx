import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Clock, Users, User, Plus, Search, UserPlus, XCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { CATEGORY_STYLES } from "@/components/ActivityFilterBar";
import { useToast } from "@/hooks/use-toast";
import ClientDetailDialog from "@/components/admin/ClientDetailDialog";

interface Reservation {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  date: string;
  time: string;
  end_time: string;
  participants: number;
  status: string;
  schedule_id: string | null;
  course_id: string | null;
  workshop_id: string | null;
}

interface Schedule {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface Course {
  id: string;
  name: string;
  category: string;
  instructor: string;
}

interface Workshop {
  id: string;
  name: string;
  category: string;
  date: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface ActivityBlock {
  id: string;
  title: string;
  category: string;
  time: string;
  end_time: string;
  type: "course" | "workshop";
  spots: number;
  spotsLeft: number;
  instructor?: string;
  reservations: Reservation[];
  allReservations: Reservation[];
}

const DAY_NAMES: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return days;
}

interface DailyViewProps {
  categoryFilter?: string;
  viewMode: "daily" | "weekly";
}

export default function DailyView({ categoryFilter = "all", viewMode }: DailyViewProps) {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());

  // "Aujourd'hui" ramène toujours sur la date du jour.
  useEffect(() => {
    if (viewMode === "daily") setCurrentDate(new Date());
  }, [viewMode]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<ActivityBlock | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [addParticipantName, setAddParticipantName] = useState("");
  const [addParticipantCount, setAddParticipantCount] = useState(1);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [knownClients, setKnownClients] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(null);

  const dateStr = useMemo(() => formatDateStr(currentDate), [currentDate]);
  const dayName = DAY_NAMES[currentDate.getDay()];
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const todayStr = formatDateStr(new Date());

  const fetchData = async () => {
    setLoading(true);
    if (viewMode === "daily") {
      const [resaRes, schedRes, courseRes, wsRes] = await Promise.all([
        supabase.from("reservations").select("*").eq("date", dateStr),
        supabase.from("course_schedules").select("*"),
        supabase.from("courses").select("id, name, category, instructor"),
        supabase.from("workshops").select("*"),
      ]);
      if (resaRes.data) setReservations(resaRes.data as unknown as Reservation[]);
      if (schedRes.data) setSchedules(schedRes.data as unknown as Schedule[]);
      if (courseRes.data) setCourses(courseRes.data as unknown as Course[]);
      if (wsRes.data) setWorkshops(wsRes.data as unknown as Workshop[]);
    } else {
      const weekStart = formatDateStr(weekDays[0]);
      const weekEnd = formatDateStr(weekDays[6]);
      const [resaRes, schedRes, courseRes, wsRes] = await Promise.all([
        supabase.from("reservations").select("*").gte("date", weekStart).lte("date", weekEnd),
        supabase.from("course_schedules").select("*"),
        supabase.from("courses").select("id, name, category, instructor"),
        supabase.from("workshops").select("*"),
      ]);
      if (resaRes.data) setAllReservations(resaRes.data as unknown as Reservation[]);
      if (schedRes.data) setSchedules(schedRes.data as unknown as Schedule[]);
      if (courseRes.data) setCourses(courseRes.data as unknown as Course[]);
      if (wsRes.data) setWorkshops(wsRes.data as unknown as Workshop[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateStr, viewMode, currentDate]);

  // Fetch known client names for smart selector
  useEffect(() => {
    const fetchClients = async () => {
      const [resProfiles, resReservations] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, user_name"),
        supabase.from("reservations").select("client_name"),
      ]);
      const names = new Set<string>();
      if (resProfiles.data) {
        for (const p of resProfiles.data as any[]) {
          const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          if (full) names.add(full);
          if (p.user_name) names.add(p.user_name);
        }
      }
      if (resReservations.data) {
        for (const r of resReservations.data as any[]) {
          if (r.client_name) names.add(r.client_name);
        }
      }
      setKnownClients([...names].sort());
    };
    fetchClients();
  }, []);

  const buildBlocks = (date: Date, resas: Reservation[]): ActivityBlock[] => {
    const result: ActivityBlock[] = [];
    const dn = DAY_NAMES[date.getDay()];
    const ds = formatDateStr(date);

    const daySchedules = schedules.filter(s => s.day === dn);
    for (const sched of daySchedules) {
      const course = courses.find(c => c.id === sched.course_id);
      if (!course) continue;
      if (categoryFilter !== "all" && course.category !== categoryFilter) continue;
      const matchingResasAll = resas.filter(r =>
        r.schedule_id === sched.id ||
        (!r.schedule_id && r.course_id === sched.course_id && r.date === ds) ||
        (!r.schedule_id && !r.course_id && r.activity_name.trim().toLowerCase().includes(course.name.trim().toLowerCase()) && r.date === ds)
      );
      result.push({
        id: `${sched.id}-${ds}`,
        title: course.name,
        category: course.category,
        time: sched.time,
        end_time: sched.end_time,
        type: "course",
        spots: sched.spots,
        spotsLeft: sched.spots_left,
        instructor: course.instructor,
        reservations: matchingResasAll.filter(r => r.status === "confirmé"),
        allReservations: matchingResasAll,
      });
    }

    const dayWorkshops = workshops.filter(w => w.date === ds);
    for (const ws of dayWorkshops) {
      if (categoryFilter !== "all" && ws.category !== categoryFilter) continue;
      const matchingResasAll = resas.filter(r =>
        r.workshop_id === ws.id ||
        (!r.workshop_id && r.activity_name.trim().toLowerCase().includes(ws.name.trim().toLowerCase()) && r.date === ds)
      );
      result.push({
        id: ws.id,
        title: ws.name,
        category: ws.category,
        time: ws.time,
        end_time: ws.end_time,
        type: "workshop",
        spots: ws.spots,
        spotsLeft: ws.spots_left,
        reservations: matchingResasAll.filter(r => r.status === "confirmé"),
        allReservations: matchingResasAll,
      });
    }

    result.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return result;
  };

  const blocks = useMemo(() => buildBlocks(currentDate, reservations), [dayName, dateStr, schedules, courses, workshops, reservations, categoryFilter]);

  const weekBlocks = useMemo(() => {
    if (viewMode !== "weekly") return [];
    return weekDays.map(date => ({
      date,
      blocks: buildBlocks(date, allReservations.filter(r => r.date === formatDateStr(date))),
    }));
  }, [weekDays, viewMode, schedules, courses, workshops, allReservations, categoryFilter]);

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const goToday = () => setCurrentDate(new Date());

  // Garde le dialog de détail synchronisé avec les données fraîches (après ajout/annulation d'un participant)
  useEffect(() => {
    if (!selectedBlock) return;
    const allBlocks = viewMode === "daily" ? blocks : weekBlocks.flatMap(w => w.blocks);
    const fresh = allBlocks.find(b => b.id === selectedBlock.id);
    if (fresh) setSelectedBlock(fresh);
  }, [blocks, weekBlocks]);

  const confirmCancelReservation = async () => {
    if (!cancellingReservation) return;
    const resa = cancellingReservation;
    await supabase.from("reservations").update({ status: "annulé" }).eq("id", resa.id);
    if (resa.schedule_id) {
      const { data: sched } = await supabase.from("course_schedules").select("spots_left").eq("id", resa.schedule_id).single();
      if (sched) await supabase.from("course_schedules").update({ spots_left: sched.spots_left + resa.participants }).eq("id", resa.schedule_id);
    } else if (resa.workshop_id) {
      const { data: ws } = await supabase.from("workshops").select("spots_left").eq("id", resa.workshop_id).single();
      if (ws) await supabase.from("workshops").update({ spots_left: ws.spots_left + resa.participants }).eq("id", resa.workshop_id);
    }
    toast({ title: "Réservation annulée", variant: "destructive" });
    setCancellingReservation(null);
    fetchData();
  };

  const reconfirmReservation = async (resa: Reservation) => {
    if (resa.schedule_id) {
      const { data: sched } = await supabase.from("course_schedules").select("spots_left").eq("id", resa.schedule_id).single();
      if (sched && sched.spots_left >= resa.participants) {
        await supabase.from("course_schedules").update({ spots_left: sched.spots_left - resa.participants }).eq("id", resa.schedule_id);
      } else {
        toast({ title: "Plus de places disponibles", variant: "destructive" });
        return;
      }
    } else if (resa.workshop_id) {
      const { data: ws } = await supabase.from("workshops").select("spots_left").eq("id", resa.workshop_id).single();
      if (ws && ws.spots_left >= resa.participants) {
        await supabase.from("workshops").update({ spots_left: ws.spots_left - resa.participants }).eq("id", resa.workshop_id);
      } else {
        toast({ title: "Plus de places disponibles", variant: "destructive" });
        return;
      }
    }
    await supabase.from("reservations").update({ status: "confirmé" }).eq("id", resa.id);
    toast({ title: "Réservation re-confirmée" });
    fetchData();
  };

  const isToday = dateStr === todayStr;

  const renderBlock = (block: ActivityBlock) => {
    const totalParticipants = block.reservations.reduce((sum, r) => sum + r.participants, 0);
    const style = CATEGORY_STYLES[block.category] || { block: "bg-muted border-border text-foreground", dot: "bg-muted-foreground" };
    const fillPct = block.spots > 0 ? Math.round((totalParticipants / block.spots) * 100) : 0;

    return (
      <div
        key={block.id}
        className={`rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${style.block}`}
        onClick={() => setSelectedBlock(block)}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm">{block.title}</h4>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {block.type === "course" ? "Cours" : "Atelier"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs opacity-80">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {block.time} - {block.end_time}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalParticipants}/{block.spots}
          </span>
        </div>
        {/* Fill progress bar */}
        <div className="mt-2 h-2 rounded-full bg-black/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${fillPct >= 80 ? "bg-destructive/60" : fillPct >= 40 ? "bg-primary/50" : "bg-primary/30"}`}
            style={{ width: `${Math.max(fillPct, 2)}%` }}
          />
        </div>
        {block.instructor && (
          <div className="flex items-center gap-1 mt-1.5 text-xs opacity-70">
            <User className="h-3 w-3" />{block.instructor}
          </div>
        )}
        {block.reservations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <div className="flex flex-wrap gap-1.5">
              {block.reservations.slice(0, 4).map(r => (
                <Badge key={r.id} variant="outline" className="text-xs bg-background/60">
                  {r.client_name} {r.participants > 1 && `(×${r.participants})`}
                </Badge>
              ))}
              {block.reservations.length > 4 && (
                <Badge variant="outline" className="text-xs bg-background/60">
                  +{block.reservations.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === "daily" ? (
        <>
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-semibold capitalize">
                {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
            </div>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
              Aucune activité programmée ce jour.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {blocks.map(renderBlock)}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="text-sm md:text-lg font-semibold">
                Semaine du {weekDays[0].toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                {" "}au {weekDays[6].toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </h3>
              {!weekDays.some(d => formatDateStr(d) === todayStr) && (
                <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={goToday}>
                  Cette semaine
                </Button>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {weekBlocks.map(({ date, blocks: dayBlks }) => {
              const isDayToday = formatDateStr(date) === todayStr;
              return (
                <div key={formatDateStr(date)}>
                  <div className={`flex items-center gap-3 mb-2 ${isDayToday ? "text-primary-dark" : "text-foreground"}`}>
                    <div className={`text-sm font-semibold capitalize ${isDayToday ? "bg-primary-dark text-primary-dark-foreground px-3 py-1 rounded-full" : ""}`}>
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </div>
                    {isDayToday && <Badge variant="outline" className="text-xs">Aujourd'hui</Badge>}
                  </div>
                  {dayBlks.length === 0 ? (
                    <div className="rounded-lg border border-dashed bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                      Aucune activité
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {dayBlks.map(renderBlock)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">{selectedBlock?.category}</Badge>
              <Badge variant="secondary" className="text-xs">{selectedBlock?.type === "course" ? "Cours" : "Atelier"}</Badge>
            </div>
            <DialogTitle className="font-display text-xl mt-2">{selectedBlock?.title}</DialogTitle>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedBlock.time} - {selectedBlock.end_time}</span>
                {selectedBlock.instructor && <span>· {selectedBlock.instructor}</span>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {selectedBlock.reservations.reduce((s, r) => s + r.participants, 0)} / {selectedBlock.spots} participants
                    </span>
                  </div>
                </div>
                {/* Fill bar in detail */}
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${selectedBlock.spots > 0 ? Math.round((selectedBlock.reservations.reduce((s, r) => s + r.participants, 0) / selectedBlock.spots) * 100) : 0}%` }}
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-3">Participants inscrits</h4>
                {selectedBlock.allReservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun participant inscrit.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBlock.allReservations.map(r => (
                      <div key={r.id} className="w-full flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-left flex-1 min-w-0 hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedParticipant(r.client_name)}
                        >
                          <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary-dark" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {r.participants} personne{r.participants > 1 ? "s" : ""}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className="text-xs" variant={r.status === "confirmé" ? "default" : "destructive"}>
                            {r.status}
                          </Badge>
                          {r.status === "confirmé" ? (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Annuler" onClick={() => setCancellingReservation(r)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary-dark" title="Rétablir" onClick={() => reconfirmReservation(r)}>
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add participant form */}
                <div className="mt-4 pt-3 border-t">
                  {!showAddForm ? (
                    <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => { setShowAddForm(true); setAddParticipantName(""); setClientSearch(""); setAddParticipantCount(1); }}>
                      <UserPlus className="h-3.5 w-3.5" /> Ajouter un participant
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" /> Ajouter un participant
                      </h4>
                      
                      {/* Smart search / select */}
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            ref={searchInputRef}
                            placeholder="Rechercher un client ou saisir un nom..."
                            value={clientSearch}
                            onChange={e => { setClientSearch(e.target.value); setShowSuggestions(true); setAddParticipantName(e.target.value); }}
                            onFocus={() => setShowSuggestions(true)}
                            className="pl-8 h-9 text-xs"
                          />
                        </div>
                        {showSuggestions && clientSearch.length >= 1 && (() => {
                          const filtered = knownClients.filter(c => c.toLowerCase().includes(clientSearch.toLowerCase()));
                          const exactMatch = knownClients.some(c => c.toLowerCase() === clientSearch.toLowerCase());
                          if (filtered.length === 0 && !clientSearch.trim()) return null;
                          return (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {filtered.slice(0, 8).map(name => (
                                <button
                                  key={name}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted text-left"
                                  onClick={() => { setAddParticipantName(name); setClientSearch(name); setShowSuggestions(false); }}
                                >
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  {name}
                                </button>
                              ))}
                              {clientSearch.trim() && !exactMatch && (
                                <button
                                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted text-left border-t text-primary font-medium"
                                  onClick={() => { setAddParticipantName(clientSearch.trim()); setShowSuggestions(false); }}
                                >
                                  <Plus className="h-3 w-3" />
                                  Nouveau : « {clientSearch.trim()} »
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {addParticipantName && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <User className="h-3 w-3" /> {addParticipantName}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Nb :</span>
                            <Input
                              type="number" min={1} max={20}
                              value={addParticipantCount}
                              onChange={e => setAddParticipantCount(Number(e.target.value))}
                              className="w-16 h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setShowAddForm(false); setAddParticipantName(""); setClientSearch(""); }}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs flex-1"
                          disabled={!addParticipantName.trim() || addingParticipant}
                          onClick={async () => {
                            if (!addParticipantName.trim() || !selectedBlock) return;
                            setAddingParticipant(true);
                            const blockDate = viewMode === "daily" ? dateStr : (() => {
                              for (const { date, blocks: dayBlks } of weekBlocks) {
                                if (dayBlks.some(b => b.id === selectedBlock.id)) return formatDateStr(date);
                              }
                              return dateStr;
                            })();
                            const insertData: any = {
                              client_name: addParticipantName.trim(),
                              participants: addParticipantCount,
                              activity_name: selectedBlock.title,
                              activity_type: selectedBlock.type,
                              date: blockDate,
                              time: selectedBlock.time,
                              end_time: selectedBlock.end_time,
                              status: "confirmé",
                            };
                            if (selectedBlock.type === "course") {
                              const schedId = selectedBlock.id.split("-")[0];
                              const sched = schedules.find(s => s.id === schedId);
                              if (sched) {
                                insertData.schedule_id = sched.id;
                                insertData.course_id = sched.course_id;
                              }
                            } else {
                              insertData.workshop_id = selectedBlock.id;
                            }
                            const { error } = await supabase.from("reservations").insert(insertData);
                            setAddingParticipant(false);
                            if (error) {
                              toast({ title: "Erreur", description: error.message, variant: "destructive" });
                            } else {
                              toast({ title: "Participant ajouté" });
                              setAddParticipantName("");
                              setClientSearch("");
                              setAddParticipantCount(1);
                              setShowAddForm(false);
                              fetchData();
                            }
                          }}
                        >
                          {addingParticipant ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmer l'ajout"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClientDetailDialog
        clientName={selectedParticipant}
        open={!!selectedParticipant}
        onOpenChange={(open) => !open && setSelectedParticipant(null)}
        onChanged={fetchData}
      />

      <AlertDialog open={!!cancellingReservation} onOpenChange={(open) => !open && setCancellingReservation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les places seront libérées et le client sera notifié de l'annulation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelReservation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
