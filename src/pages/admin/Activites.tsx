import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, X, List, CalendarDays, Search, Clock, Users, CalendarIcon, Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ActivityCalendar from "@/components/admin/ActivityCalendar";

// ── Types ──

interface Schedule {
  id?: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
}

interface UnifiedActivity {
  id: string;
  name: string;
  description: string;
  long_description: string;
  category: string;
  image: string;
  instructor: string;
  instructor_id: string | null;
  reminder_template: string;
  source: "course" | "workshop";
  // Course-specific
  frequency?: string;
  spots?: number;
  spots_left?: number;
  schedules?: Schedule[];
  // Workshop-specific
  date?: string;
  time?: string;
  end_time?: string;
  duration?: string;
  price?: number;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const CATEGORIES = [
  { value: "yoga", label: "Yoga & Pilates" },
  { value: "poterie", label: "Poterie" },
  { value: "bien-etre", label: "Bien-être" },
];

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

// ── Form types ──

interface EventSlot {
  type: "recurring" | "ponctuel";
  // Recurring
  day: string;
  time: string;
  end_time: string;
  spots: number;
  // Ponctuel
  date: string;
  price: number;
}

interface ActivityForm {
  name: string;
  description: string;
  long_description: string;
  category: string;
  instructor: string;
  image: string;
  reminder_template: string;
  spots: number;
  events: EventSlot[];
}

const emptyEvent = (): EventSlot => ({
  type: "recurring",
  day: "Lundi",
  time: "09:00",
  end_time: "10:00",
  spots: 12,
  date: "",
  price: 0,
});

const emptyForm = (): ActivityForm => ({
  name: "",
  description: "",
  long_description: "",
  category: "yoga",
  instructor: "Élodie",
  image: "",
  reminder_template: "",
  spots: 12,
  events: [emptyEvent()],
});

export default function AdminActivites() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [instructorsList, setInstructorsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<UnifiedActivity | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm());
  const [deletingItem, setDeletingItem] = useState<{ id: string; source: "course" | "workshop" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const [coursesRes, workshopsRes, schedulesRes, instrRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("workshops").select("*").order("date"),
      supabase.from("course_schedules").select("*"),
      supabase.from("instructors").select("id, name").eq("active", true).order("name"),
    ]);

    const schedulesMap: Record<string, Schedule[]> = {};
    if (schedulesRes.data) {
      for (const s of schedulesRes.data) {
        if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
        schedulesMap[s.course_id].push({ id: s.id, day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, spots_left: s.spots_left });
      }
    }

    const unified: UnifiedActivity[] = [];

    if (coursesRes.data) {
      for (const c of coursesRes.data as any[]) {
        unified.push({
          id: c.id, name: c.name, description: c.description || "", long_description: c.long_description || "",
          category: c.category, image: c.image || "", instructor: c.instructor, instructor_id: c.instructor_id,
          reminder_template: c.reminder_template || "", source: "course",
          frequency: c.frequency, spots: c.spots, spots_left: c.spots_left,
          schedules: schedulesMap[c.id] || [],
        });
      }
    }

    if (workshopsRes.data) {
      for (const w of workshopsRes.data as any[]) {
        const instrName = w.instructor_id && instrRes.data
          ? (instrRes.data as any[]).find(i => i.id === w.instructor_id)?.name || "Élodie"
          : "Élodie";
        unified.push({
          id: w.id, name: w.name, description: w.description || "", long_description: w.long_description || "",
          category: w.category, image: w.image || "", instructor: instrName, instructor_id: w.instructor_id,
          reminder_template: w.reminder_template || "", source: "workshop",
          date: w.date, time: w.time, end_time: w.end_time, duration: w.duration,
          price: w.price, spots: w.spots, spots_left: w.spots_left,
        });
      }
    }

    unified.sort((a, b) => a.name.localeCompare(b.name));
    setActivities(unified);
    if (instrRes.data) setInstructorsList(instrRes.data as { id: string; name: string }[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = activities;
    if (categoryFilter !== "all") list = list.filter(a => a.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    return list;
  }, [activities, categoryFilter, searchQuery]);

  // ── Open dialog ──
  const openNew = () => {
    setEditingActivity(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (a: UnifiedActivity) => {
    setEditingActivity(a);
    const events: EventSlot[] = [];
    if (a.source === "course" && a.schedules) {
      for (const s of a.schedules) {
        events.push({ type: "recurring", day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, date: "", price: 0 });
      }
    } else if (a.source === "workshop") {
      events.push({ type: "ponctuel", day: "Lundi", time: a.time || "09:00", end_time: a.end_time || "10:00", spots: a.spots || 8, date: a.date || "", price: a.price || 0 });
    }
    if (events.length === 0) events.push(emptyEvent());
    setForm({
      name: a.name, description: a.description, long_description: a.long_description,
      category: a.category, instructor: a.instructor, image: a.image,
      reminder_template: a.reminder_template, spots: a.spots || 12, events,
    });
    setDialogOpen(true);
  };

  // ── Save ──
  const save = async () => {
    const recurringEvents = form.events.filter(e => e.type === "recurring");
    const ponctuelEvents = form.events.filter(e => e.type === "ponctuel");
    const instrId = instructorsList.find(i => i.name === form.instructor)?.id || null;

    // If editing, delete the old entity
    if (editingActivity) {
      if (editingActivity.source === "course") {
        await supabase.from("course_schedules").delete().eq("course_id", editingActivity.id);
        await supabase.from("courses").delete().eq("id", editingActivity.id);
      } else {
        await supabase.from("workshops").delete().eq("id", editingActivity.id);
      }
    }

    // Create recurring events as a course
    if (recurringEvents.length > 0) {
      const firstSlot = recurringEvents[0];
      const duration = calcDuration(firstSlot.time, firstSlot.end_time);
      const days = [...new Set(recurringEvents.map(e => e.day))];
      const { data } = await supabase.from("courses").insert({
        name: form.name, description: form.description, long_description: form.long_description,
        category: form.category, instructor: form.instructor, instructor_id: instrId,
        image: form.image, reminder_template: form.reminder_template,
        spots: firstSlot.spots, spots_left: firstSlot.spots,
        day: firstSlot.day, time: firstSlot.time, end_time: firstSlot.end_time,
        duration, days, frequency: "hebdomadaire",
      }).select("id").single();
      if (data) {
        const scheduleRows = recurringEvents.map(e => ({
          course_id: data.id, day: e.day, time: e.time, end_time: e.end_time, spots: e.spots, spots_left: e.spots,
        }));
        await supabase.from("course_schedules").insert(scheduleRows);
      }
    }

    // Create ponctuel events as workshops
    for (const evt of ponctuelEvents) {
      if (!evt.date) continue;
      const duration = calcDuration(evt.time, evt.end_time);
      await supabase.from("workshops").insert({
        name: form.name, description: form.description, long_description: form.long_description,
        category: form.category, instructor_id: instrId,
        image: form.image, reminder_template: form.reminder_template,
        date: evt.date, time: evt.time, end_time: evt.end_time,
        duration, spots: evt.spots, spots_left: evt.spots, price: evt.price,
      });
    }

    toast({ title: editingActivity ? "Activité modifiée" : "Activité créée ✓" });
    setDialogOpen(false);
    fetchData();
  };

  // ── Delete ──
  const executeDelete = async () => {
    if (!deletingItem) return;
    if (deletingItem.source === "course") {
      await supabase.from("course_schedules").delete().eq("course_id", deletingItem.id);
      await supabase.from("courses").delete().eq("id", deletingItem.id);
    } else {
      await supabase.from("workshops").delete().eq("id", deletingItem.id);
    }
    toast({ title: "Activité supprimée", variant: "destructive" });
    setDeletingItem(null);
    fetchData();
  };

  // ── Event slot helpers ──
  const addEvent = (type: "recurring" | "ponctuel") => {
    setForm(prev => ({
      ...prev,
      events: [...prev.events, { ...emptyEvent(), type }],
    }));
  };
  const removeEvent = (idx: number) => {
    setForm(prev => ({ ...prev, events: prev.events.filter((_, i) => i !== idx) }));
  };
  const updateEvent = (idx: number, patch: Partial<EventSlot>) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.map((e, i) => i === idx ? { ...e, ...patch } : e),
    }));
  };

  if (loading) {
    return (
      <AdminLayout title="Activités">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Activités">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" /> Liste
          </Button>
          <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setViewMode("calendar")}>
            <CalendarDays className="h-4 w-4" /> Calendrier
          </Button>
          <div className="hidden md:flex gap-1.5 ml-2">
            <Badge variant={categoryFilter === "all" ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setCategoryFilter("all")}>Toutes</Badge>
            {CATEGORIES.map(c => (
              <Badge key={c.value} variant={categoryFilter === c.value ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setCategoryFilter(c.value)}>{c.label}</Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nouvelle activité
          </Button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <ActivityCalendar />
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} activité{filtered.length > 1 ? "s" : ""}</p>

          {/* ─── Desktop grid ─── */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => (
              <ActivityCard key={`${a.source}-${a.id}`} activity={a} onEdit={() => openEdit(a)} onDelete={() => setDeletingItem({ id: a.id, source: a.source })} />
            ))}
          </div>

          {/* ─── Mobile list ─── */}
          <div className="space-y-3 md:hidden">
            {filtered.map(a => (
              <ActivityCardMobile key={`${a.source}-${a.id}`} activity={a} onEdit={() => openEdit(a)} onDelete={() => setDeletingItem({ id: a.id, source: a.source })} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucune activité trouvée.</div>
          )}
        </>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingActivity ? "Modifier" : "Nouvelle"} activité
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Basic info - 2 columns on desktop */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Vinyasa Flow" /></div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Intervenant</Label>
                  {instructorsList.length > 0 ? (
                    <Select value={form.instructor} onValueChange={v => setForm({ ...form, instructor: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {instructorsList.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                        <SelectItem value="Élodie">Élodie (par défaut)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div><Label>Description courte</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Résumé affiché sur la carte..." /></div>
                <div>
                  <Label>Image</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    {form.image && <img src={form.image} alt="Preview" className="h-14 w-14 rounded-lg object-cover" />}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const ext = file.name.split(".").pop();
                        const path = `activities/${Date.now()}.${ext}`;
                        const { error } = await supabase.storage.from("activity-images").upload(path, file);
                        if (!error) {
                          const { data: urlData } = supabase.storage.from("activity-images").getPublicUrl(path);
                          setForm(prev => ({ ...prev, image: urlData.publicUrl }));
                        }
                      }}
                      className="text-xs"
                    />
                    {form.image && (
                      <Button type="button" variant="link" size="sm" className="text-xs text-destructive p-0 h-auto" onClick={() => setForm(prev => ({ ...prev, image: "" }))}>
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div><Label>Fiche produit (description longue)</Label><Textarea value={form.long_description} onChange={e => setForm({ ...form, long_description: e.target.value })} rows={4} placeholder="Description détaillée..." /></div>

            {/* ── Events / Créneaux ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold mb-0">Événements</Label>
                <div className="flex gap-1.5">
                  <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => addEvent("recurring")}>
                    <Repeat className="h-3 w-3" /> + Récurrent
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => addEvent("ponctuel")}>
                    <CalendarIcon className="h-3 w-3" /> + Ponctuel
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {form.events.map((evt, idx) => (
                  <div key={idx} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={evt.type === "recurring" ? "default" : "secondary"} className="text-xs gap-1">
                        {evt.type === "recurring" ? <><Repeat className="h-3 w-3" /> Récurrent</> : <><CalendarIcon className="h-3 w-3" /> Ponctuel</>}
                      </Badge>
                      {form.events.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeEvent(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {evt.type === "recurring" ? (
                        <Select value={evt.day} onValueChange={v => updateEvent(idx, { day: v })}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input type="date" className="w-[150px] h-8 text-xs" value={evt.date} onChange={e => updateEvent(idx, { date: e.target.value })} />
                      )}
                      <Input type="time" className="w-[100px] h-8 text-xs" value={evt.time} onChange={e => updateEvent(idx, { time: e.target.value })} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input type="time" className="w-[100px] h-8 text-xs" value={evt.end_time} onChange={e => updateEvent(idx, { end_time: e.target.value })} />
                      {evt.time && evt.end_time && (
                        <span className="text-xs text-muted-foreground">{calcDuration(evt.time, evt.end_time)}</span>
                      )}
                      <Input type="number" className="w-[70px] h-8 text-xs" value={evt.spots} onChange={e => updateEvent(idx, { spots: Number(e.target.value) })} placeholder="Places" />
                      {evt.type === "ponctuel" && (
                        <div className="flex items-center gap-1">
                          <Input type="number" className="w-[70px] h-8 text-xs" value={evt.price} onChange={e => updateEvent(idx, { price: Number(e.target.value) })} placeholder="Prix" />
                          <span className="text-xs text-muted-foreground">€</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>📧 Modèle de rappel (e-mail)</Label>
              <Textarea value={form.reminder_template} onChange={e => setForm({ ...form, reminder_template: e.target.value })} rows={3} placeholder="Bonjour {nom}, nous avons hâte de vous retrouver..." />
              <p className="text-xs text-muted-foreground mt-1">Variables : {"{nom}"}, {"{activité}"}, {"{date}"}, {"{heure}"}</p>
            </div>

            <Button className="w-full" onClick={save} disabled={!form.name || form.events.length === 0}>
              {editingActivity ? "Enregistrer les modifications" : "Créer l'activité"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette activité ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// ── Desktop Activity Card ──

function ActivityCard({ activity: a, onEdit, onDelete }: { activity: UnifiedActivity; onEdit: () => void; onDelete: () => void }) {
  const catLabel = CATEGORIES.find(c => c.value === a.category)?.label || a.category;
  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow group">
      {a.image && (
        <div className="aspect-[16/7] overflow-hidden bg-muted">
          <img src={a.image} alt={a.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-semibold text-sm text-primary-dark">{a.name}</h3>
            {a.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.description}</p>}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>
          <span className="text-xs text-muted-foreground">{a.instructor}</span>
        </div>

        {/* Show events summary */}
        <div className="space-y-1">
          {a.source === "course" && a.schedules?.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Repeat className="h-3 w-3 shrink-0" />
              <span>{s.day.slice(0, 3)} {s.time}-{s.end_time}</span>
              <span>· {s.spots_left}/{s.spots} places</span>
            </div>
          ))}
          {a.source === "workshop" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3 shrink-0" />
              <span>{a.date ? new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"} {a.time}-{a.end_time}</span>
              {a.price !== undefined && a.price > 0 && <span className="font-medium text-foreground">{a.price}€</span>}
              <span>· {a.spots_left}/{a.spots} places</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Activity Card ──

function ActivityCardMobile({ activity: a, onEdit, onDelete }: { activity: UnifiedActivity; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{a.name}</h4>
          {a.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
        {a.source === "course" && a.schedules?.map((s, i) => (
          <Badge key={i} variant="secondary" className="text-[10px]">{s.day.slice(0, 3)} {s.time}-{s.end_time}</Badge>
        ))}
        {a.source === "workshop" && (
          <Badge variant="secondary" className="text-[10px]">
            {a.date ? new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"} {a.time}
          </Badge>
        )}
        {a.price !== undefined && a.price > 0 && <Badge variant="outline" className="text-[10px]">{a.price}€</Badge>}
      </div>
    </div>
  );
}
