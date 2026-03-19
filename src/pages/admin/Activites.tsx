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
import { Calendar } from "@/components/ui/calendar";
import { Plus, Pencil, Trash2, Loader2, X, CalendarDays, Search, Clock, Users, CalendarIcon, Repeat, Mail, FileText, MapPin, Settings, LayoutGrid, Copy, Info, CreditCard, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ActivityCalendar from "@/components/admin/ActivityCalendar";
import DailyView from "@/components/admin/DailyView";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const REMINDER_TIMINGS = [
  { value: "7j", label: "1 semaine" },
  { value: "3j", label: "3 jours" },
  { value: "1j", label: "1 jour" },
  { value: "12h", label: "12 heures" },
  { value: "3h", label: "3 heures" },
  { value: "1h", label: "1 heure" },
];

const YOGA_INTENSITY = [
  { value: "none", label: "Non défini" },
  { value: "doux", label: "🌿 Doux" },
  { value: "equilibre", label: "⚖️ Équilibré" },
  { value: "dynamique", label: "🔥 Dynamique" },
];

const ATELIER_INTENSITY = [
  { value: "none", label: "Non défini" },
  { value: "novice", label: "🌱 Novice" },
  { value: "amateur", label: "🎨 Amateur" },
  { value: "experimente", label: "⭐ Expérimenté" },
];

function getIntensityOptions(category: string) {
  if (category === "yoga") return YOGA_INTENSITY;
  return ATELIER_INTENSITY;
}

function getIntensityLabel(value: string | undefined) {
  if (!value || value === "none") return undefined;
  const all = [...YOGA_INTENSITY, ...ATELIER_INTENSITY];
  return all.find(i => i.value === value)?.label;
}

// ── Inline Template Editor ──
function TemplateEditor({ value, onChange, variables, readOnly, showInsertModalities }: {
  value: string; onChange: (v: string) => void;
  variables: { key: string; label: string }[];
  readOnly?: boolean;
  showInsertModalities?: boolean;
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
          {showInsertModalities && (
            <Button type="button" size="sm" variant="outline" className="h-5 text-[10px] px-1.5 gap-1 border-dashed"
              onClick={() => insertVariable("{modalités}")}>
              <MapPin className="h-3 w-3" /> Insérer modalités
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Types ──
interface Schedule {
  id?: string; day: string; time: string; end_time: string; spots: number; spots_left: number;
  price?: number; inclusions?: string; card_yoga_count?: number;
}

interface UnifiedActivity {
  id: string; name: string; description: string; long_description: string; category: string;
  image: string; instructor: string; instructor_id: string | null;
  reminder_template: string; modalities: string; source: "course" | "workshop";
  frequency?: string; spots?: number; spots_left?: number; schedules?: Schedule[];
  date?: string; time?: string; end_time?: string; duration?: string; price?: number;
  intensity?: string; reminder_timing?: string;
  inclusions?: string; card_yoga_count?: number;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const CATEGORIES = [
  { value: "yoga", label: "Yoga & Pilates", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
  { value: "bien-etre", label: "Bien-être", dot: "bg-[hsl(0,55%,58%)]", activeBg: "bg-[hsl(0,55%,58%)]" },
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

const FREQUENCY_OPTIONS = [
  { value: "hebdomadaire", label: "Toutes les semaines" },
  { value: "mensuel", label: "Tous les mois" },
  { value: "personnalise", label: "Personnalisé (calendrier)" },
];

interface EventSlot {
  type: "recurring" | "ponctuel";
  frequency: string;
  day: string; time: string; end_time: string; spots: number;
  date: string; price: number;
  reminder_template: string;
  modalities: string;
  customDates: string[];
  inclusions: string;
  card_yoga_count: number;
  complementary_info: string;
  _scheduleId?: string;
  _workshopId?: string;
}

interface ActivityForm {
  name: string; description: string; long_description: string; category: string;
  instructor: string; image: string; spots: number;
  events: EventSlot[];
  default_reminder: string;
  default_modalities: string;
  intensity: string;
  reminder_timing: string;
}

const emptyEvent = (): EventSlot => ({
  type: "recurring", frequency: "hebdomadaire", day: "Lundi", time: "09:00", end_time: "10:00", spots: 12,
  date: "", price: 0, reminder_template: "", modalities: "", customDates: [],
  inclusions: "", card_yoga_count: 0, complementary_info: "",
});

const emptyForm = (): ActivityForm => ({
  name: "", description: "", long_description: "", category: "yoga",
  instructor: "", image: "", spots: 12, events: [emptyEvent()],
  default_reminder: "", default_modalities: "",
  intensity: "none", reminder_timing: "1j",
});

// ── Custom Date Picker for "personnalisé" ──
function CustomDatesPicker({ dates, onChange, time, endTime, spots, onTimeChange, onEndTimeChange, onSpotsChange }: {
  dates: string[]; onChange: (dates: string[]) => void;
  time: string; endTime: string; spots: number;
  onTimeChange: (v: string) => void; onEndTimeChange: (v: string) => void; onSpotsChange: (v: number) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const selectedDates = dates.map(d => new Date(d + "T12:00:00"));

  const toggleDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, "yyyy-MM-dd");
    if (dates.includes(dateStr)) {
      onChange(dates.filter(d => d !== dateStr));
    } else {
      onChange([...dates, dateStr].sort());
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Input type="time" className="w-[90px] h-8 text-xs" value={time} onChange={e => onTimeChange(e.target.value)} />
          <span className="text-muted-foreground text-xs">→</span>
          <Input type="time" className="w-[90px] h-8 text-xs" value={endTime} onChange={e => onEndTimeChange(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <Input type="number" className="w-[70px] h-8 text-xs" value={spots} onChange={e => onSpotsChange(Number(e.target.value))} />
        </div>
      </div>
      <Calendar
        mode="multiple"
        selected={selectedDates}
        onSelect={(_, selectedDay) => toggleDate(selectedDay)}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className={cn("p-3 pointer-events-auto border rounded-lg")}
        locale={fr}
      />
      {dates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dates.map(d => (
            <Badge key={d} variant="secondary" className="text-[10px] gap-1">
              {new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              <button onClick={() => onChange(dates.filter(dd => dd !== d))} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── EDITOR SECTION TABS ──
// ══════════════════════════════════════════════════════════
type EditorSection = "description" | "events" | "reminders";

const EDITOR_SECTIONS: { key: EditorSection; label: string; icon: React.ReactNode }[] = [
  { key: "description", label: "Description", icon: <FileText className="h-4 w-4" /> },
  { key: "events", label: "Événements", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "reminders", label: "Rappels", icon: <Mail className="h-4 w-4" /> },
];

// ══════════════════════════════════════════════════════════
// ── FULL-PAGE EDITOR COMPONENT ──
// ══════════════════════════════════════════════════════════
function ActivityEditor({
  form, setForm, editingActivity, instructorsList, onSave, onCancel, onDelete,
  currentDefaultReminder, currentDefaultModalities,
}: {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
  editingActivity: UnifiedActivity | null;
  instructorsList: { id: string; name: string }[];
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  currentDefaultReminder: string;
  currentDefaultModalities: string;
}) {
  const [section, setSection] = useState<EditorSection>("description");
  const [eventsView, setEventsView] = useState<"list" | "calendar">("list");
  const [eventsCalMonth, setEventsCalMonth] = useState<Date>(new Date());
  const [detailDialogIdx, setDetailDialogIdx] = useState<number | null>(null);

  const addEvent = (type: "recurring" | "ponctuel") => {
    setForm(prev => ({ ...prev, events: [...prev.events, { ...emptyEvent(), type }] }));
  };
  const removeEvent = (idx: number) => {
    setForm(prev => ({ ...prev, events: prev.events.filter((_, i) => i !== idx) }));
  };
  const updateEvent = (idx: number, patch: Partial<EventSlot>) => {
    setForm(prev => ({ ...prev, events: prev.events.map((e, i) => i === idx ? { ...e, ...patch } : e) }));
  };
  const duplicateEvent = (idx: number) => {
    setForm(prev => {
      const cloned = { ...prev.events[idx], _scheduleId: undefined, _workshopId: undefined };
      const newEvents = [...prev.events];
      newEvents.splice(idx + 1, 0, cloned);
      return { ...prev, events: newEvents };
    });
  };

  // Calendar view: get all dates from events
  const allEventDates = useMemo(() => {
    const dates: { date: string; idx: number; label: string }[] = [];
    form.events.forEach((evt, idx) => {
      if (evt.type === "ponctuel" && evt.date) {
        dates.push({ date: evt.date, idx, label: `${evt.time}-${evt.end_time}` });
      }
      if (evt.type === "recurring" && evt.frequency === "personnalise") {
        evt.customDates.forEach(d => {
          dates.push({ date: d, idx, label: `${evt.time}-${evt.end_time}` });
        });
      }
    });
    return dates;
  }, [form.events]);

  const calendarSelectedDates = allEventDates.map(d => new Date(d.date + "T12:00:00"));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-display font-semibold truncate">
            {editingActivity ? form.name || "Modifier l'activité" : "Nouvelle activité"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {editingActivity ? "Modification en cours" : "Création d'une nouvelle activité"}
          </p>
        </div>
        <Button onClick={onSave} disabled={!form.name || form.events.length === 0} className="shrink-0">
          {editingActivity ? "Enregistrer" : "Créer"}
        </Button>
      </div>

      {/* Section navigation */}
      <div className="flex gap-1.5 border-b pb-0">
        {EDITOR_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-[2px]",
              section === s.key
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* ═══ SECTION: DESCRIPTION ═══ */}
      {section === "description" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Vinyasa Flow" />
              </div>
              <div>
                <Label>Description courte</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Résumé affiché sur la carte..." />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Intensité</Label>
                <Select value={form.intensity} onValueChange={v => setForm({ ...form, intensity: v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {getIntensityOptions(form.category).map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Intervenant</Label>
                {instructorsList.length > 0 ? (
                  <Select value={form.instructor} onValueChange={v => setForm({ ...form, instructor: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {instructorsList.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} />
                )}
              </div>
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

          <div>
            <Label>Fiche produit (description longue)</Label>
            <Textarea value={form.long_description} onChange={e => setForm({ ...form, long_description: e.target.value })} rows={5} placeholder="Description détaillée affichée dans les détails de l'activité..." />
          </div>
        </div>
      )}

      {/* ═══ SECTION: ÉVÉNEMENTS ═══ */}
      {section === "events" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant={eventsView === "list" ? "default" : "outline"} className="gap-1 text-xs" onClick={() => setEventsView("list")}>
                <FileText className="h-3.5 w-3.5" /> Liste
              </Button>
              <Button type="button" size="sm" variant={eventsView === "calendar" ? "default" : "outline"} className="gap-1 text-xs" onClick={() => setEventsView("calendar")}>
                <CalendarDays className="h-3.5 w-3.5" /> Calendrier
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => addEvent("recurring")}>
                <Repeat className="h-3.5 w-3.5" /> + Récurrent
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => addEvent("ponctuel")}>
                <CalendarIcon className="h-3.5 w-3.5" /> + Ponctuel
              </Button>
            </div>
          </div>

          {/* Calendar view */}
          {eventsView === "calendar" && (
            <div className="border rounded-lg p-4 bg-muted/10">
              <Calendar
                mode="multiple"
                selected={calendarSelectedDates}
                onSelect={(_, selectedDay) => {
                  if (!selectedDay) return;
                  const dateStr = format(selectedDay, "yyyy-MM-dd");
                  // Check if there's already an event on this date
                  const existing = allEventDates.find(d => d.date === dateStr);
                  if (existing) {
                    // Scroll to it in list view
                    setEventsView("list");
                  } else {
                    // Create a new ponctuel event for this date
                    setForm(prev => ({
                      ...prev,
                      events: [...prev.events, { ...emptyEvent(), type: "ponctuel", date: dateStr }],
                    }));
                    setEventsView("list");
                  }
                }}
                month={eventsCalMonth}
                onMonthChange={setEventsCalMonth}
                className="p-3 pointer-events-auto"
                locale={fr}
              />
              {allEventDates.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allEventDates.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      {new Date(d.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {d.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* List view */}
          {eventsView === "list" && (
            <div className="space-y-3">
              {form.events.map((evt, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Select value={evt.type} onValueChange={v => updateEvent(idx, { type: v as "recurring" | "ponctuel" })}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recurring"><span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> Récurrent</span></SelectItem>
                          <SelectItem value="ponctuel"><span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Ponctuel</span></SelectItem>
                        </SelectContent>
                      </Select>
                      {evt.type === "recurring" && (
                        <Select value={evt.frequency} onValueChange={v => updateEvent(idx, { frequency: v })}>
                          <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* ── DÉTAILLER button ── */}
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                        onClick={() => setDetailDialogIdx(idx)}>
                        <Info className="h-3.5 w-3.5" /> Détailler
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Dupliquer"
                        onClick={() => duplicateEvent(idx)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {form.events.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeEvent(idx)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Temporality */}
                  {evt.type === "recurring" && evt.frequency === "personnalise" ? (
                    <CustomDatesPicker
                      dates={evt.customDates}
                      onChange={dates => updateEvent(idx, { customDates: dates })}
                      time={evt.time} endTime={evt.end_time} spots={evt.spots}
                      onTimeChange={v => updateEvent(idx, { time: v })}
                      onEndTimeChange={v => updateEvent(idx, { end_time: v })}
                      onSpotsChange={v => updateEvent(idx, { spots: v })}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {evt.type === "recurring" ? (
                        <Select value={evt.day} onValueChange={v => updateEvent(idx, { day: v })}>
                          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input type="date" className="w-[150px] h-8 text-xs" value={evt.date} onChange={e => updateEvent(idx, { date: e.target.value })} />
                      )}
                      <div className="flex items-center gap-1">
                        <Input type="time" className="w-[90px] h-8 text-xs" value={evt.time} onChange={e => updateEvent(idx, { time: e.target.value })} />
                        <span className="text-muted-foreground text-xs">→</span>
                        <Input type="time" className="w-[90px] h-8 text-xs" value={evt.end_time} onChange={e => updateEvent(idx, { end_time: e.target.value })} />
                      </div>
                      {evt.time && evt.end_time && <span className="text-xs text-muted-foreground">{calcDuration(evt.time, evt.end_time)}</span>}
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <Input type="number" className="w-[70px] h-8 text-xs" value={evt.spots} onChange={e => updateEvent(idx, { spots: Number(e.target.value) })} placeholder="Places" />
                      </div>
                    </div>
                  )}

                  {/* Price + Card */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input type="number" className="w-[70px] h-8 text-xs" value={evt.price} onChange={e => updateEvent(idx, { price: Number(e.target.value) })} placeholder="Prix" />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                    <span className="text-xs text-muted-foreground">ou</span>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <Input type="number" className="w-[50px] h-8 text-xs" value={evt.card_yoga_count} onChange={e => updateEvent(idx, { card_yoga_count: Number(e.target.value) })} min={0} />
                      <span className="text-xs text-muted-foreground">carte{evt.card_yoga_count > 1 ? "s" : ""} yoga</span>
                    </div>
                    {/* Indicators */}
                    {(evt.inclusions || evt.complementary_info || evt.reminder_template || evt.modalities) && (
                      <div className="flex gap-1 ml-auto">
                        {evt.inclusions && <Badge variant="outline" className="text-[10px] gap-0.5"><Info className="h-2.5 w-2.5" /> Inclus</Badge>}
                        {evt.complementary_info && <Badge variant="outline" className="text-[10px] gap-0.5"><FileText className="h-2.5 w-2.5" /> Infos</Badge>}
                        {(evt.reminder_template || evt.modalities) && <Badge variant="outline" className="text-[10px] gap-0.5"><Mail className="h-2.5 w-2.5" /> Rappel</Badge>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {form.events.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Aucun événement. Ajoutez un créneau récurrent ou ponctuel.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION: RAPPELS ═══ */}
      {section === "reminders" && (
        <div className="space-y-6">
          <div className="border rounded-lg p-5 space-y-5 bg-card">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold mb-0">Modèles par défaut</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Ces textes seront utilisés pour tous les événements de cette activité, sauf si personnalisés via le bouton « Détailler » de chaque événement.
            </p>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Modèle de rappel par défaut</Label>
              <TemplateEditor value={form.default_reminder} onChange={v => setForm(prev => ({ ...prev, default_reminder: v }))} variables={REMINDER_VARIABLES} showInsertModalities={true} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><MapPin className="h-3.5 w-3.5" /> Modalités par défaut</Label>
              <TemplateEditor value={form.default_modalities} onChange={v => setForm(prev => ({ ...prev, default_modalities: v }))} variables={MODALITIES_VARIABLES} />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" /> Timing des rappels</Label>
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_TIMINGS.map(t => {
                  const timings = form.reminder_timing.split(",").filter(Boolean);
                  const isActive = timings.includes(t.value);
                  return (
                    <Button key={t.value} type="button" size="sm"
                      variant={isActive ? "default" : "outline"}
                      className="h-7 text-xs px-3"
                      onClick={() => {
                        const newTimings = isActive
                          ? timings.filter(v => v !== t.value)
                          : [...timings, t.value];
                        setForm(prev => ({ ...prev, reminder_timing: newTimings.filter(Boolean).join(",") || "1j" }));
                      }}>
                      {t.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">Sélectionnez quand envoyer les rappels avant l'événement.</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete + Save footer */}
      <div className="flex items-center justify-between border-t pt-4">
        {editingActivity ? (
          <Button variant="destructive" size="sm" className="gap-1.5" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Supprimer cette activité
          </Button>
        ) : <div />}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Annuler</Button>
          <Button onClick={onSave} disabled={!form.name || form.events.length === 0}>
            {editingActivity ? "Enregistrer les modifications" : "Créer l'activité"}
          </Button>
        </div>
      </div>

      {/* ═══ DÉTAILLER DIALOG ═══ */}
      <Dialog open={detailDialogIdx !== null} onOpenChange={open => { if (!open) setDetailDialogIdx(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Détailler l'événement</DialogTitle>
          </DialogHeader>
          {detailDialogIdx !== null && (() => {
            const evt = form.events[detailDialogIdx];
            if (!evt) return null;
            const isReminderCustom = !!evt.reminder_template;
            const isModalitiesCustom = !!evt.modalities;
            return (
              <div className="space-y-5 pt-2">
                {/* Inclusions */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Info className="h-4 w-4 text-primary" /> Inclus
                  </Label>
                  <p className="text-xs text-muted-foreground">Ce qui est inclus dans le prix (visible lors de la réservation)</p>
                  <Textarea
                    value={evt.inclusions}
                    onChange={e => updateEvent(detailDialogIdx, { inclusions: e.target.value })}
                    rows={3}
                    placeholder="Ex : le goûter est compris, matériel fourni..."
                    className="text-sm"
                  />
                </div>

                {/* Infos complémentaires */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" /> Infos complémentaires
                  </Label>
                  <p className="text-xs text-muted-foreground">Informations supplémentaires visibles lors de la réservation</p>
                  <Textarea
                    value={evt.complementary_info}
                    onChange={e => updateEvent(detailDialogIdx, { complementary_info: e.target.value })}
                    rows={3}
                    placeholder="Ex : Prévoir des vêtements confortables, apporter un tapis..."
                    className="text-sm"
                  />
                </div>

                {/* Modalités de rappels */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <Mail className="h-4 w-4 text-primary" /> Modalités de rappels
                  </Label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Modèle de rappel</Label>
                      <div className="flex gap-1.5">
                        <Button type="button" size="sm" variant={!isReminderCustom ? "default" : "outline"} className="h-6 text-[10px] px-2 gap-1"
                          onClick={() => updateEvent(detailDialogIdx, { reminder_template: "" })}>
                          <FileText className="h-3 w-3" /> Par défaut
                        </Button>
                        <Button type="button" size="sm" variant={isReminderCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                          onClick={() => { if (!isReminderCustom) updateEvent(detailDialogIdx, { reminder_template: form.default_reminder }); }}>
                          Personnalisé
                        </Button>
                      </div>
                    </div>
                    <TemplateEditor
                      value={isReminderCustom ? evt.reminder_template : form.default_reminder}
                      onChange={v => updateEvent(detailDialogIdx, { reminder_template: v })}
                      variables={REMINDER_VARIABLES}
                      readOnly={!isReminderCustom}
                      showInsertModalities={true}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Modalités (consignes, adresse)</Label>
                      <div className="flex gap-1.5">
                        <Button type="button" size="sm" variant={!isModalitiesCustom ? "default" : "outline"} className="h-6 text-[10px] px-2 gap-1"
                          onClick={() => updateEvent(detailDialogIdx, { modalities: "" })}>
                          <FileText className="h-3 w-3" /> Par défaut
                        </Button>
                        <Button type="button" size="sm" variant={isModalitiesCustom ? "default" : "outline"} className="h-6 text-[10px] px-2"
                          onClick={() => { if (!isModalitiesCustom) updateEvent(detailDialogIdx, { modalities: form.default_modalities }); }}>
                          Personnalisé
                        </Button>
                      </div>
                    </div>
                    <TemplateEditor
                      value={isModalitiesCustom ? evt.modalities : form.default_modalities}
                      onChange={v => updateEvent(detailDialogIdx, { modalities: v })}
                      variables={MODALITIES_VARIABLES}
                      readOnly={!isModalitiesCustom}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── MAIN PAGE ──
// ══════════════════════════════════════════════════════════
export default function AdminActivites() {
  const { toast } = useToast();
  const { get: getSetting, ready: settingsReady } = useSiteSettings();
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [instructorsList, setInstructorsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Editor state: when editorOpen, show full-page editor instead of list
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<UnifiedActivity | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm());
  const [deletingItem, setDeletingItem] = useState<{ id: string; source: "course" | "workshop" } | null>(null);

  const currentDefaultReminder = settingsReady ? getSetting("default_reminder", INITIAL_DEFAULT_REMINDER) : INITIAL_DEFAULT_REMINDER;
  const currentDefaultModalities = settingsReady ? getSetting("default_modalities", INITIAL_DEFAULT_MODALITIES) : INITIAL_DEFAULT_MODALITIES;

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
      for (const s of schedulesRes.data as any[]) {
        if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
        schedulesMap[s.course_id].push({
          id: s.id, day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, spots_left: s.spots_left,
          price: s.price, inclusions: s.inclusions || "", card_yoga_count: s.card_yoga_count || 0,
        });
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
          intensity: c.intensity || "none", reminder_timing: c.reminder_timing || "1j",
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
          intensity: w.intensity || "none", reminder_timing: w.reminder_timing || "1j",
          inclusions: w.inclusions || "", card_yoga_count: w.card_yoga_count || 0,
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
    setEditorOpen(true);
  };

  const openEdit = (a: UnifiedActivity) => {
    setEditingActivity(a);
    const events: EventSlot[] = [];
    if (a.source === "course" && a.schedules) {
      for (const s of a.schedules) {
        events.push({
          type: "recurring", frequency: a.frequency || "hebdomadaire",
          day: s.day, time: s.time, end_time: s.end_time, spots: s.spots,
          date: "", price: s.price || 0,
          reminder_template: a.reminder_template, modalities: a.modalities,
          customDates: [],
          inclusions: s.inclusions || "", card_yoga_count: s.card_yoga_count || 0,
          complementary_info: "",
          _scheduleId: s.id,
        });
      }
    } else if (a.source === "workshop") {
      events.push({
        type: "ponctuel", frequency: "hebdomadaire",
        day: "Lundi", time: a.time || "09:00", end_time: a.end_time || "10:00",
        spots: a.spots || 8, date: a.date || "", price: a.price || 0,
        reminder_template: a.reminder_template, modalities: a.modalities,
        customDates: [],
        inclusions: a.inclusions || "", card_yoga_count: a.card_yoga_count || 0,
        complementary_info: "",
        _workshopId: a.id,
      });
    }
    if (events.length === 0) events.push(emptyEvent());
    setForm({
      name: a.name, description: a.description, long_description: a.long_description,
      category: a.category, instructor: a.instructor, image: a.image, spots: a.spots || 12, events,
      default_reminder: a.reminder_template || currentDefaultReminder,
      default_modalities: a.modalities || currentDefaultModalities,
      intensity: a.intensity || "none",
      reminder_timing: a.reminder_timing || "1j",
    });
    setEditorOpen(true);
  };

  const save = async () => {
    const instrId = instructorsList.find(i => i.name === form.instructor)?.id || null;

    const recurringEvents = form.events.filter(e => e.type === "recurring" && e.frequency !== "personnalise");
    const customDateEvents = form.events.filter(e => e.type === "recurring" && e.frequency === "personnalise");
    const ponctuelEvents = form.events.filter(e => e.type === "ponctuel");

    const allPonctuelEvents: EventSlot[] = [...ponctuelEvents];
    for (const evt of customDateEvents) {
      for (const dateStr of evt.customDates) {
        allPonctuelEvents.push({ ...evt, type: "ponctuel", date: dateStr });
      }
    }

    // Shared fields (without 'instructor' which doesn't exist in workshops table)
    const sharedData = {
      name: form.name, description: form.description, long_description: form.long_description,
      category: form.category, instructor_id: instrId,
      image: form.image, reminder_template: form.default_reminder,
      modalities: form.default_modalities,
      intensity: form.intensity === "none" ? "" : form.intensity, reminder_timing: form.reminder_timing,
    };
    // courses table has 'instructor' column, workshops does not
    const courseData = { ...sharedData, instructor: form.instructor };
    const workshopData = sharedData;

    // ── Handle recurring events → courses table ──
    if (recurringEvents.length > 0) {
      const firstSlot = recurringEvents[0];
      const duration = calcDuration(firstSlot.time, firstSlot.end_time);
      const days = [...new Set(recurringEvents.map(e => e.day))];

      if (editingActivity?.source === "course") {
        await supabase.from("courses").update({
          ...courseData,
          spots: firstSlot.spots, spots_left: firstSlot.spots,
          day: firstSlot.day, time: firstSlot.time, end_time: firstSlot.end_time,
          duration, days, frequency: firstSlot.frequency,
        } as any).eq("id", editingActivity.id);

        await supabase.from("course_schedules").delete().eq("course_id", editingActivity.id);
        const scheduleRows = recurringEvents.map(e => ({
          course_id: editingActivity.id, day: e.day, time: e.time, end_time: e.end_time,
          spots: e.spots, spots_left: e.spots, price: e.price,
          inclusions: e.inclusions, card_yoga_count: e.card_yoga_count,
        }));
        await supabase.from("course_schedules").insert(scheduleRows);
      } else {
        if (editingActivity?.source === "workshop") {
          await supabase.from("workshops").delete().eq("id", editingActivity.id);
        }
        const { data } = await supabase.from("courses").insert({
          ...courseData,
          spots: firstSlot.spots, spots_left: firstSlot.spots,
          day: firstSlot.day, time: firstSlot.time, end_time: firstSlot.end_time,
          duration, days, frequency: firstSlot.frequency,
        } as any).select("id").single();
        if (data) {
          const scheduleRows = recurringEvents.map(e => ({
            course_id: data.id, day: e.day, time: e.time, end_time: e.end_time,
            spots: e.spots, spots_left: e.spots, price: e.price,
            inclusions: e.inclusions, card_yoga_count: e.card_yoga_count,
          }));
          await supabase.from("course_schedules").insert(scheduleRows);
        }
      }
    } else if (editingActivity?.source === "course") {
      await supabase.from("course_schedules").delete().eq("course_id", editingActivity.id);
      await supabase.from("courses").delete().eq("id", editingActivity.id);
    }

    // ── Handle ponctuel events → workshops table ──
    const validPonctuelEvents = allPonctuelEvents.filter(e => !!e.date);
    if (validPonctuelEvents.length > 0) {
      if (editingActivity?.source === "workshop") {
        const firstEvt = validPonctuelEvents[0];
        const duration = calcDuration(firstEvt.time, firstEvt.end_time);
        const { error: updateErr } = await supabase.from("workshops").update({
          ...workshopData,
          date: firstEvt.date, time: firstEvt.time, end_time: firstEvt.end_time,
          duration, spots: firstEvt.spots, spots_left: firstEvt.spots, price: firstEvt.price,
          frequency: "ponctuel",
          inclusions: firstEvt.inclusions, card_yoga_count: firstEvt.card_yoga_count,
        } as any).eq("id", editingActivity.id);
        if (updateErr) {
          console.error("Workshop update error:", updateErr);
          toast({ title: "Erreur lors de la mise à jour", description: updateErr.message, variant: "destructive" });
          return;
        }
        for (let i = 1; i < validPonctuelEvents.length; i++) {
          const evt = validPonctuelEvents[i];
          const dur = calcDuration(evt.time, evt.end_time);
          const { error: insertErr } = await supabase.from("workshops").insert({
            ...workshopData,
            date: evt.date, time: evt.time, end_time: evt.end_time,
            duration: dur, spots: evt.spots, spots_left: evt.spots, price: evt.price,
            frequency: "ponctuel",
            inclusions: evt.inclusions, card_yoga_count: evt.card_yoga_count,
          } as any);
          if (insertErr) {
            console.error("Workshop insert error:", insertErr);
            toast({ title: "Erreur lors de l'insertion", description: insertErr.message, variant: "destructive" });
          }
        }
      } else {
        for (const evt of validPonctuelEvents) {
          const duration = calcDuration(evt.time, evt.end_time);
          const { error: insertErr } = await supabase.from("workshops").insert({
            ...courseData,
            date: evt.date, time: evt.time, end_time: evt.end_time,
            duration, spots: evt.spots, spots_left: evt.spots, price: evt.price,
            frequency: "ponctuel",
            inclusions: evt.inclusions, card_yoga_count: evt.card_yoga_count,
          } as any);
          if (insertErr) {
            console.error("Workshop insert error:", insertErr);
            toast({ title: "Erreur lors de la création", description: insertErr.message, variant: "destructive" });
          }
        }
      }
    }

    toast({ title: editingActivity ? "Activité modifiée" : "Activité créée ✓" });
    setEditorOpen(false);
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

  if (loading) {
    return (
      <AdminLayout title="Activités et réservations">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  // ── Full-page editor mode ──
  if (editorOpen) {
    return (
      <AdminLayout title="Activités et réservations">
        <ActivityEditor
          form={form}
          setForm={setForm}
          editingActivity={editingActivity}
          instructorsList={instructorsList}
          onSave={save}
          onCancel={() => setEditorOpen(false)}
          onDelete={() => {
            if (editingActivity) {
              setEditorOpen(false);
              setDeletingItem({ id: editingActivity.id, source: editingActivity.source });
            }
          }}
          currentDefaultReminder={currentDefaultReminder}
          currentDefaultModalities={currentDefaultModalities}
        />

        {/* Delete confirmation */}
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

  return (
    <AdminLayout title="Activités et réservations">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={viewMode === "cards" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setViewMode("cards")}>
            <LayoutGrid className="h-4 w-4" /> Activités
          </Button>
          <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setViewMode("calendar")}>
            <CalendarDays className="h-4 w-4" /> Planning et réservations
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <Badge
              variant={categoryFilter === "all" ? "default" : "outline"}
              className={`cursor-pointer text-sm h-8 px-3`}
              onClick={() => setCategoryFilter("all")}
            >Toutes</Badge>
            {CATEGORIES.map(c => {
              const isActive = categoryFilter === c.value;
              return (
                <Badge
                  key={c.value}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer text-sm h-8 px-3 gap-1 ${isActive && c.activeBg ? `${c.activeBg} text-white border-transparent hover:opacity-90` : ""}`}
                  onClick={() => setCategoryFilter(c.value)}
                >
                  {c.dot && <div className={`w-2 h-2 rounded-full ${isActive ? "bg-white/80" : c.dot}`} />}
                  {c.label}
                </Badge>
              );
            })}
          </div>
          <div className="relative flex-1 w-full sm:w-auto sm:max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
        </div>
        {viewMode === "cards" && (
          <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 self-start" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nouvelle activité
          </Button>
        )}
      </div>

      {viewMode === "calendar" ? (
        <ActivityCalendar onEditActivity={(id, source) => {
          const act = activities.find(a => a.id === id && a.source === source);
          if (act) openEdit(act);
        }} />
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{filtered.length} activité{filtered.length > 1 ? "s" : ""}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(a => (
              <ActivityCard key={`${a.source}-${a.id}`} activity={a} onEdit={() => openEdit(a)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucune activité trouvée.</div>
          )}
        </>
      )}

      {/* Delete confirmation */}
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

// ── Activity Card ──
function ActivityCard({ activity: a, onEdit }: { activity: UnifiedActivity; onEdit: () => void }) {
  const cat = CATEGORIES.find(c => c.value === a.category);
  const catLabel = cat?.label || a.category;
  const catDot = cat?.dot || "";
  const intensityLabel = getIntensityLabel(a.intensity);
  const CATEGORY_TEXT: Record<string, string> = {
    yoga: "text-[hsl(210,60%,40%)]",
    poterie: "text-[hsl(40,76%,35%)]",
    "bien-etre": "text-[hsl(0,55%,38%)]",
  };
  const titleColor = CATEGORY_TEXT[a.category] || "text-primary-dark";
  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow group cursor-pointer" onClick={onEdit}>
      {a.image && (
        <div className="aspect-[16/7] overflow-hidden bg-muted">
          <img src={a.image} alt={a.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className={`font-display font-semibold text-sm ${titleColor}`}>{a.name}</h3>
            {a.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.description}</p>}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            {catDot && <div className={`w-1.5 h-1.5 rounded-full ${catDot}`} />}
            {catLabel}
          </Badge>
          {intensityLabel && <Badge variant="secondary" className="text-[10px]">{intensityLabel}</Badge>}
          <span className="text-xs text-muted-foreground">{a.instructor}</span>
        </div>
        <div className="space-y-1">
          {a.source === "course" && a.schedules?.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Repeat className="h-3 w-3 shrink-0" />
              <span>{s.day.slice(0, 3)} {s.time}-{s.end_time}</span>
              <span>· <Users className="h-3 w-3 inline" /> {s.spots - s.spots_left}/{s.spots}</span>
            </div>
          ))}
          {a.source === "workshop" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3 shrink-0" />
              <span>{a.date ? new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"} {a.time}-{a.end_time}</span>
              {a.price !== undefined && a.price > 0 && <span className="font-medium text-foreground">{a.price}€</span>}
              <span>· <Users className="h-3 w-3 inline" /> {(a.spots || 0) - (a.spots_left || 0)}/{a.spots}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
