import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Users, User, Plus, Search, UserPlus, XCircle, RotateCcw, Trash2 } from "lucide-react";
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

interface DailyViewProps {
  date: Date;
  categoryFilter?: string;
}

export default function DailyView({ date, categoryFilter = "all" }: DailyViewProps) {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
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
  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<ActivityBlock | null>(null);

  const dateStr = useMemo(() => formatDateStr(date), [date]);
  const dayName = DAY_NAMES[date.getDay()];

  const fetchData = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [dateStr]);

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

  const blocks = useMemo((): ActivityBlock[] => {
    const result: ActivityBlock[] = [];

    const daySchedules = schedules.filter(s => s.day === dayName);
    for (const sched of daySchedules) {
      const course = courses.find(c => c.id === sched.course_id);
      if (!course) continue;
      if (categoryFilter !== "all" && course.category !== categoryFilter) continue;
      const matchingResasAll = reservations.filter(r =>
        r.schedule_id === sched.id ||
        (!r.schedule_id && r.course_id === sched.course_id && r.date === dateStr) ||
        (!r.schedule_id && !r.course_id && r.activity_name.trim().toLowerCase().includes(course.name.trim().toLowerCase()) && r.date === dateStr)
      );
      result.push({
        id: `${sched.id}-${dateStr}`,
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

    const dayWorkshops = workshops.filter(w => w.date === dateStr);
    for (const ws of dayWorkshops) {
      if (categoryFilter !== "all" && ws.category !== categoryFilter) continue;
      const matchingResasAll = reservations.filter(r =>
        r.workshop_id === ws.id ||
        (!r.workshop_id && r.activity_name.trim().toLowerCase().includes(ws.name.trim().toLowerCase()) && r.date === dateStr)
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
  }, [dayName, dateStr, schedules, courses, workshops, reservations, categoryFilter]);

  // Garde le sheet de détail synchronisé avec les données fraîches
  useEffect(() => {
    if (!selectedBlock) return;
    const fresh = blocks.find(b => b.id === selectedBlock.id);
    setSelectedBlock(fresh || null);
  }, [blocks]);

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

  const updateBlockField = async (patch: Partial<{ time: string; end_time: string; spots: number }>) => {
    if (!selectedBlock) return;
    const table = selectedBlock.type === "course" ? "course_schedules" : "workshops";
    const id = selectedBlock.type === "course" ? selectedBlock.id.split("-")[0] : selectedBlock.id;
    const payload: any = { ...patch };
    if (patch.spots !== undefined) {
      payload.spots_left = selectedBlock.spotsLeft + (patch.spots - selectedBlock.spots);
    }
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const confirmDeleteBlock = async () => {
    if (!pendingDeleteBlock) return;
    const table = pendingDeleteBlock.type === "course" ? "course_schedules" : "workshops";
    const id = pendingDeleteBlock.type === "course" ? pendingDeleteBlock.id.split("-")[0] : pendingDeleteBlock.id;
    const { error } = await supabase.from(table).delete().eq("id", id);
    setPendingDeleteBlock(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Événement supprimé" });
    setSelectedBlock(null);
    fetchData();
  };

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
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {blocks.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
          Aucune activité programmée ce jour.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {blocks.map(renderBlock)}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlock(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">{selectedBlock?.category}</Badge>
              <Badge variant="secondary" className="text-xs">{selectedBlock?.type === "course" ? "Cours" : "Atelier"}</Badge>
            </div>
            <SheetTitle className="font-display text-xl mt-1">{selectedBlock?.title}</SheetTitle>
          </SheetHeader>
          {selectedBlock && (
            <div className="space-y-4 pt-2 pb-6">
              {selectedBlock.instructor && <p className="text-sm text-muted-foreground">Intervenant·e : {selectedBlock.instructor}</p>}

              <div className="rounded-lg border p-3 space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Modifier l'événement</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="time" className="w-[100px] h-9 text-sm" value={selectedBlock.time} onChange={e => updateBlockField({ time: e.target.value })} />
                  <span className="text-muted-foreground text-xs">→</span>
                  <Input type="time" className="w-[100px] h-9 text-sm" value={selectedBlock.end_time} onChange={e => updateBlockField({ end_time: e.target.value })} />
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input type="number" className="w-[70px] h-9 text-sm" value={selectedBlock.spots} onChange={e => updateBlockField({ spots: Number(e.target.value) })} />
                  </div>
                </div>
                {selectedBlock.type === "course" && (
                  <p className="text-[11px] text-muted-foreground">Récurrent chaque {dayName} — modifier l'horaire changera toutes les occurrences.</p>
                )}
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs" onClick={() => setPendingDeleteBlock(selectedBlock)}>
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer cet événement
                </Button>
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
                            const insertData: any = {
                              client_name: addParticipantName.trim(),
                              participants: addParticipantCount,
                              activity_name: selectedBlock.title,
                              activity_type: selectedBlock.type,
                              date: dateStr,
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
        </SheetContent>
      </Sheet>

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

      <AlertDialog open={!!pendingDeleteBlock} onOpenChange={(open) => !open && setPendingDeleteBlock(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteBlock?.type === "course"
                ? `Toutes les occurrences futures de "${pendingDeleteBlock?.title}" chaque semaine seront supprimées.`
                : `"${pendingDeleteBlock?.title}" sera retiré du planning.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
