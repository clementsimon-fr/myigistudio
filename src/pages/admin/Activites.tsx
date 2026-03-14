import React, { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, X, List, CalendarDays, Search, Clock, Users, CalendarIcon, Repeat, Mail, FileText, MapPin, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ActivityCalendar from "@/components/admin/ActivityCalendar";
import { useSiteSettings, saveSiteSettings } from "@/hooks/useSiteSettings";

// ── Template Variables ──
const TEMPLATE_VARIABLES = [
  { key: "{nom}", label: "Nom" },
  { key: "{activité}", label: "Activité" },
  { key: "{date}", label: "Date" },
  { key: "{heure}", label: "Heure" },
  { key: "{intervenant}", label: "Intervenant" },
  { key: "{adresse}", label: "Adresse" },
];

const REMINDER_VARIABLES = TEMPLATE_VARIABLES.filter(v => ["{nom}", "{activité}", "{date}", "{heure}", "{intervenant}"].includes(v.key));
const MODALITIES_VARIABLES = TEMPLATE_VARIABLES.filter(v => ["{activité}", "{date}", "{heure}", "{adresse}", "{intervenant}"].includes(v.key));

const INITIAL_DEFAULT_REMINDER = "Bonjour {nom}, nous avons hâte de vous retrouver pour {activité} le {date} à {heure}. À bientôt !";
const INITIAL_DEFAULT_MODALITIES = "📍 Adresse : {adresse}\n\n🧘 Merci d'arriver 5 minutes avant le début de la séance.\n🚗 Parking disponible à proximité.\n💧 Pensez à apporter votre bouteille d'eau.";

// ── Inline Template Editor ──
function TemplateEditor({ value, onChange, variables, readOnly }: {
  value: string; onChange: (v: string) => void;
  variables: { key: string; label: string }[];
  readOnly?: boolean;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    if (readOnly) return;
    const ta = textareaRef.current;
    if (!ta) { onChange(value + variable); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = value.substring(0, start) + variable + value.substring(end);
    onChange(newVal);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  return (
    <div className="space-y-1.5">
      <Textarea ref={textareaRef} value={value}
        onChange={e => onChange(e.target.value)}
        rows={3} readOnly={readOnly} className={`text-xs ${readOnly ? "opacity-60" : ""}`} />
      {!readOnly && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">Insérer :</span>
          {variables.map(v => (
            <Button key={v.key} type="button" size="sm" variant="outline" className="h-5 text-[10px] px-1.5 font-mono"
              onClick={() => insertVariable(v.key)}>{v.key}</Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Types ──
interface Schedule {
  id?: string; day: string; time: string; end_time: string; spots: number; spots_left: number;
}

interface UnifiedActivity {
  id: string; name: string; description: string; long_description: string; category: string;
  image: string; instructor: string; instructor_id: string | null;
  reminder_template: string; modalities: string; source: "course" | "workshop";
  frequency?: string; spots?: number; spots_left?: number; schedules?: Schedule[];
  date?: string; time?: string; end_time?: string; duration?: string; price?: number;
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

interface EventSlot {
  type: "recurring" | "ponctuel";
  day: string; time: string; end_time: string; spots: number;
  date: string; price: number;
  reminder_template: string;
  modalities: string;
}

interface ActivityForm {
  name: string; description: string; long_description: string; category: string;
  instructor: string; image: string; spots: number;
  events: EventSlot[];
  default_reminder: string;
  default_modalities: string;
}

const emptyEvent = (): EventSlot => ({
  type: "recurring", day: "Lundi", time: "09:00", end_time: "10:00", spots: 12,
  date: "", price: 0, reminder_template: "", modalities: "",
});

const emptyForm = (): ActivityForm => ({
  name: "", description: "", long_description: "", category: "yoga",
  instructor: "Élodie", image: "", spots: 12, events: [emptyEvent()],
  default_reminder: "", default_modalities: "",
});

export default function AdminActivites() {
  const { toast } = useToast();
  const { get: getSetting, ready: settingsReady } = useSiteSettings();
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

  // Global defaults dialog
  const [defaultsDialogOpen, setDefaultsDialogOpen] = useState(false);
  const [globalReminder, setGlobalReminder] = useState("");
  const [globalModalities, setGlobalModalities] = useState("");

  useEffect(() => {
    if (settingsReady) {
      setGlobalReminder(getSetting("default_reminder", INITIAL_DEFAULT_REMINDER));
      setGlobalModalities(getSetting("default_modalities", INITIAL_DEFAULT_MODALITIES));
    }
  }, [settingsReady]);

  const currentDefaultReminder = globalReminder || INITIAL_DEFAULT_REMINDER;
  const currentDefaultModalities = globalModalities || INITIAL_DEFAULT_MODALITIES;

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
          reminder_template: c.reminder_template || "", modalities: c.modalities || "", source: "course",
          frequency: c.frequency, spots: c.spots, spots_left: c.spots_left,
          schedules: schedulesMap[c.id] || [],
        });
      }
    }
    if (workshopsRes.data) {
      for (const w of workshopsRes.data as any[]) {
        const instrName = w.instructor_id && instrRes.data
          ? (instrRes.data as any[]).find(i => i.id === w.instructor_id)?.name || "Élodie" : "Élodie";
        unified.push({
          id: w.id, name: w.name, description: w.description || "", long_description: w.long_description || "",
          category: w.category, image: w.image || "", instructor: instrName, instructor_id: w.instructor_id,
          reminder_template: w.reminder_template || "", modalities: w.modalities || "", source: "workshop",
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

  const filtered = useMemo(() => {
    let list = activities;
    if (categoryFilter !== "all") list = list.filter(a => a.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    return list;
  }, [activities, categoryFilter, searchQuery]);

  const openNew = () => {
    setEditingActivity(null);
    setForm({ ...emptyForm(), default_reminder: currentDefaultReminder, default_modalities: currentDefaultModalities });
    setDialogOpen(true);
  };

  const openEdit = (a: UnifiedActivity) => {
    setEditingActivity(a);
    const events: EventSlot[] = [];
    if (a.source === "course" && a.schedules) {
      for (const s of a.schedules) {
        events.push({ type: "recurring", day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, date: "", price: 0, reminder_template: a.reminder_template, modalities: a.modalities });
      }
    } else if (a.source === "workshop") {
      events.push({ type: "ponctuel", day: "Lundi", time: a.time || "09:00", end_time: a.end_time || "10:00", spots: a.spots || 8, date: a.date || "", price: a.price || 0, reminder_template: a.reminder_template, modalities: a.modalities });
    }
    if (events.length === 0) events.push(emptyEvent());
    setForm({
      name: a.name, description: a.description, long_description: a.long_description,
      category: a.category, instructor: a.instructor, image: a.image, spots: a.spots || 12, events,
      default_reminder: currentDefaultReminder, default_modalities: currentDefaultModalities,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const recurringEvents = form.events.filter(e => e.type === "recurring");
    const ponctuelEvents = form.events.filter(e => e.type === "ponctuel");
    const instrId = instructorsList.find(i => i.name === form.instructor)?.id || null;

    // Resolve templates: empty string means "use default"
    const resolveReminder = (evt: EventSlot) => evt.reminder_template || "";
    const resolveModalities = (evt: EventSlot) => evt.modalities || "";

    if (editingActivity) {
      if (editingActivity.source === "course") {
        await supabase.from("course_schedules").delete().eq("course_id", editingActivity.id);
        await supabase.from("courses").delete().eq("id", editingActivity.id);
      } else {
        await supabase.from("workshops").delete().eq("id", editingActivity.id);
      }
    }

    if (recurringEvents.length > 0) {
      const firstSlot = recurringEvents[0];
      const duration = calcDuration(firstSlot.time, firstSlot.end_time);
      const days = [...new Set(recurringEvents.map(e => e.day))];
      const { data } = await supabase.from("courses").insert({
        name: form.name, description: form.description, long_description: form.long_description,
        category: form.category, instructor: form.instructor, instructor_id: instrId,
        image: form.image, reminder_template: resolveReminder(firstSlot),
        modalities: resolveModalities(firstSlot),
        spots: firstSlot.spots, spots_left: firstSlot.spots,
        day: firstSlot.day, time: firstSlot.time, end_time: firstSlot.end_time,
        duration, days, frequency: "hebdomadaire",
      } as any).select("id").single();
      if (data) {
        const scheduleRows = recurringEvents.map(e => ({
          course_id: data.id, day: e.day, time: e.time, end_time: e.end_time, spots: e.spots, spots_left: e.spots,
        }));
        await supabase.from("course_schedules").insert(scheduleRows);
      }
    }

    for (const evt of ponctuelEvents) {
      if (!evt.date) continue;
      const duration = calcDuration(evt.time, evt.end_time);
      await supabase.from("workshops").insert({
        name: form.name, description: form.description, long_description: form.long_description,
        category: form.category, instructor_id: instrId,
        image: form.image, reminder_template: resolveReminder(evt),
        modalities: resolveModalities(evt),
        date: evt.date, time: evt.time, end_time: evt.end_time,
        duration, spots: evt.spots, spots_left: evt.spots, price: evt.price,
      } as any);
    }

    toast({ title: editingActivity ? "Activité modifiée" : "Activité créée ✓" });
    setDialogOpen(false);
    fetchData();
  };

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

  const addEvent = (type: "recurring" | "ponctuel") => {
    setForm(prev => ({ ...prev, events: [...prev.events, { ...emptyEvent(), type }] }));
  };
  const removeEvent = (idx: number) => {
    setForm(prev => ({ ...prev, events: prev.events.filter((_, i) => i !== idx) }));
  };
  const updateEvent = (idx: number, patch: Partial<EventSlot>) => {
    setForm(prev => ({ ...prev, events: prev.events.map((e, i) => i === idx ? { ...e, ...patch } : e) }));
  };

  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  // Save global defaults
  const saveGlobalDefaults = async () => {
    await saveSiteSettings([
      { key: "default_reminder", value: globalReminder },
      { key: "default_modalities", value: globalModalities },
    ]);
    toast({ title: "Modèles par défaut sauvegardés ✓" });
    setDefaultsDialogOpen(false);
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
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => (
              <ActivityCard key={`${a.source}-${a.id}`} activity={a} onEdit={() => openEdit(a)} onDelete={() => setDeletingItem({ id: a.id, source: a.source })} />
            ))}
          </div>
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
            {/* Basic info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Vinyasa Flow" /></div>
                <div>
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
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
                    <Input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const ext = file.name.split(".").pop();
                      const path = `activities/${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from("activity-images").upload(path, file);
                      if (!error) {
                        const { data: urlData } = supabase.storage.from("activity-images").getPublicUrl(path);
                        setForm(prev => ({ ...prev, image: urlData.publicUrl }));
                      }
                    }} className="text-xs" />
                    {form.image && (
                      <Button type="button" variant="link" size="sm" className="text-xs text-destructive p-0 h-auto" onClick={() => setForm(prev => ({ ...prev, image: "" }))}>×</Button>
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
                {form.events.map((evt, idx) => {
                  const isExpanded = expandedEvent === idx;
                  const isReminderCustom = !!evt.reminder_template;
                  const isModalitiesCustom = !!evt.modalities;
                  return (
                    <div key={idx} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={evt.type === "recurring" ? "default" : "secondary"} className="text-xs gap-1">
                          {evt.type === "recurring" ? <><Repeat className="h-3 w-3" /> Récurrent</> : <><CalendarIcon className="h-3 w-3" /> Ponctuel</>}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] px-2"
                            onClick={() => setExpandedEvent(isExpanded ? null : idx)}>
                            {isExpanded ? "Réduire" : "Détails"}
                          </Button>
                          {form.events.length > 1 && (
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeEvent(idx)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* ── Bloc Temporalité ── */}
                      <div className="flex flex-wrap items-center gap-2">
                        {evt.type === "recurring" ? (
                          <Select value={evt.day} onValueChange={v => updateEvent(idx, { day: v })}>
                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Input type="date" className="w-[150px] h-8 text-xs" value={evt.date} onChange={e => updateEvent(idx, { date: e.target.value })} />
                        )}
                        <Input type="time" className="w-[100px] h-8 text-xs" value={evt.time} onChange={e => updateEvent(idx, { time: e.target.value })} />
                        <span className="text-muted-foreground text-xs">→</span>
                        <Input type="time" className="w-[100px] h-8 text-xs" value={evt.end_time} onChange={e => updateEvent(idx, { end_time: e.target.value })} />
                        {evt.time && evt.end_time && <span className="text-xs text-muted-foreground">{calcDuration(evt.time, evt.end_time)}</span>}
                        <Input type="number" className="w-[70px] h-8 text-xs" value={evt.spots} onChange={e => updateEvent(idx, { spots: Number(e.target.value) })} placeholder="Places" />
                        {evt.type === "ponctuel" && (
                          <div className="flex items-center gap-1">
                            <Input type="number" className="w-[70px] h-8 text-xs" value={evt.price} onChange={e => updateEvent(idx, { price: Number(e.target.value) })} placeholder="Prix" />
                            <span className="text-xs text-muted-foreground">€</span>
                          </div>
                        )}
                      </div>

                      {/* ── Expanded: Rappel + Modalités per event ── */}
                      {isExpanded && (
                        <div className="space-y-4 pt-2 border-t mt-2">
                          {/* Reminder */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Modèle de rappel</Label>
                              <div className="flex gap-1.5">
                                <Button type="button" size="sm" variant={!isReminderCustom ? "default" : "outline"} className="h-6 text-[10px] px-2 gap-1"
                                  onClick={() => updateEvent(idx, { reminder_template: "" })}>
                                  <FileText className="h-3 w-3" /> Par défaut
                                </Button>
                                <Button type="button" size="sm" variant={isReminderCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                                  onClick={() => { if (!isReminderCustom) updateEvent(idx, { reminder_template: currentDefaultReminder }); }}>
                                  Personnalisé
                                </Button>
                              </div>
                            </div>
                            <TemplateEditor
                              value={isReminderCustom ? evt.reminder_template : currentDefaultReminder}
                              onChange={v => updateEvent(idx, { reminder_template: v })}
                              variables={REMINDER_VARIABLES}
                              readOnly={!isReminderCustom}
                            />
                          </div>

                          {/* Modalities */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Modalités (consignes, adresse)</Label>
                              <div className="flex gap-1.5">
                                <Button type="button" size="sm" variant={!isModalitiesCustom ? "default" : "outline"} className="h-6 text-[10px] px-2 gap-1"
                                  onClick={() => updateEvent(idx, { modalities: "" })}>
                                  <FileText className="h-3 w-3" /> Par défaut
                                </Button>
                                <Button type="button" size="sm" variant={isModalitiesCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                                  onClick={() => { if (!isModalitiesCustom) updateEvent(idx, { modalities: currentDefaultModalities }); }}>
                                  Personnalisé
                                </Button>
                              </div>
                            </div>
                            <TemplateEditor
                              value={isModalitiesCustom ? evt.modalities : currentDefaultModalities}
                              onChange={v => updateEvent(idx, { modalities: v })}
                              variables={MODALITIES_VARIABLES}
                              readOnly={!isModalitiesCustom}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button className="w-full" onClick={save} disabled={!form.name || form.events.length === 0}>
              {editingActivity ? "Enregistrer les modifications" : "Créer l'activité"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Global Defaults Dialog ── */}
      <Dialog open={defaultsDialogOpen} onOpenChange={setDefaultsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Settings className="h-5 w-5" /> Modèles par défaut
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Ces textes seront utilisés par défaut pour toutes les activités. Vous pouvez les personnaliser individuellement dans les détails de chaque événement.</p>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm"><Mail className="h-4 w-4" /> Modèle de rappel par défaut</Label>
              <TemplateEditor value={globalReminder} onChange={setGlobalReminder} variables={REMINDER_VARIABLES} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm"><MapPin className="h-4 w-4" /> Modalités par défaut</Label>
              <TemplateEditor value={globalModalities} onChange={setGlobalModalities} variables={MODALITIES_VARIABLES} />
            </div>
            <Button className="w-full" onClick={saveGlobalDefaults}>Enregistrer les modèles par défaut</Button>
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
