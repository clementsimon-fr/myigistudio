import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, ArrowUpDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  id?: string;
  day: string;
  time: string;
  end_time: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  category: string;
  day: string;
  days: string[];
  time: string;
  end_time: string;
  duration: string;
  frequency: string;
  instructor: string;
  spots: number;
  spots_left: number;
  schedules?: Schedule[];
}

interface Workshop {
  id: string;
  name: string;
  description: string;
  category: string;
  date: string;
  time: string;
  end_time: string;
  duration: string;
  frequency: string;
  price: number;
  spots: number;
  spots_left: number;
  image: string;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_ORDER: Record<string, number> = { Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6, Dimanche: 7 };
const FREQUENCIES = [
  { value: "hebdomadaire", label: "Hebdomadaire" },
  { value: "mensuel", label: "Mensuel" },
  { value: "ponctuel", label: "Ponctuel" },
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

type SortKey = "name" | "day" | "spots" | "instructor" | "frequency";
type SortDir = "asc" | "desc";

export default function AdminActivites() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"course" | "workshop">("course");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const emptyCourseForm = { name: "", description: "", category: "yoga", frequency: "hebdomadaire", instructor: "Élodie", spots: 12, schedules: [{ day: "Mardi", time: "09:00", end_time: "10:00" }] as Schedule[] };
  const [courseForm, setCourseForm] = useState(emptyCourseForm);

  const emptyWorkshopForm = { name: "", description: "", category: "poterie", date: "", time: "14:00", end_time: "16:00", frequency: "ponctuel", price: 0, spots: 8, image: "" };
  const [workshopForm, setWorkshopForm] = useState(emptyWorkshopForm);

  const fetchData = async () => {
    setLoading(true);
    const [coursesRes, workshopsRes, schedulesRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("workshops").select("*").order("date"),
      supabase.from("course_schedules").select("*"),
    ]);

    const schedulesMap: Record<string, Schedule[]> = {};
    if (schedulesRes.data) {
      for (const s of schedulesRes.data) {
        if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
        schedulesMap[s.course_id].push({ id: s.id, day: s.day, time: s.time, end_time: s.end_time });
      }
    }

    if (coursesRes.data) {
      setCourses((coursesRes.data as unknown as Course[]).map(c => ({
        ...c,
        schedules: schedulesMap[c.id] || [],
      })));
    }
    if (workshopsRes.data) setWorkshops(workshopsRes.data as unknown as Workshop[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Sorting logic
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "day": {
          const aDay = a.schedules?.[0]?.day || a.day || "";
          const bDay = b.schedules?.[0]?.day || b.day || "";
          cmp = (DAY_ORDER[aDay] || 99) - (DAY_ORDER[bDay] || 99);
          break;
        }
        case "spots": cmp = a.spots_left - b.spots_left; break;
        case "instructor": cmp = a.instructor.localeCompare(b.instructor); break;
        case "frequency": cmp = (a.frequency || "").localeCompare(b.frequency || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [courses, sortKey, sortDir]);

  // === COURSE CRUD ===
  const openNewCourse = () => {
    setEditingId(null);
    setCourseForm(emptyCourseForm);
    setDialogType("course");
    setDialogOpen(true);
  };
  const openEditCourse = (c: Course) => {
    setEditingId(c.id);
    setCourseForm({
      name: c.name,
      description: c.description || "",
      category: c.category,
      frequency: c.frequency || "hebdomadaire",
      instructor: c.instructor,
      spots: c.spots,
      schedules: c.schedules && c.schedules.length > 0
        ? c.schedules.map(s => ({ id: s.id, day: s.day, time: s.time, end_time: s.end_time }))
        : [{ day: c.day, time: c.time, end_time: c.end_time || "" }],
    });
    setDialogType("course");
    setDialogOpen(true);
  };

  const saveCourse = async () => {
    const firstSchedule = courseForm.schedules[0] || { day: "Lundi", time: "09:00", end_time: "10:00" };
    const duration = calcDuration(firstSchedule.time, firstSchedule.end_time);
    const days = [...new Set(courseForm.schedules.map(s => s.day))];

    const payload = {
      name: courseForm.name,
      description: courseForm.description,
      category: courseForm.category,
      frequency: courseForm.frequency,
      instructor: courseForm.instructor,
      spots: courseForm.spots,
      day: firstSchedule.day,
      time: firstSchedule.time,
      end_time: firstSchedule.end_time,
      duration,
      days,
    };

    let courseId = editingId;

    if (editingId) {
      await supabase.from("courses").update(payload).eq("id", editingId);
      // Replace schedules
      await supabase.from("course_schedules").delete().eq("course_id", editingId);
      toast({ title: "Cours modifié" });
    } else {
      const { data } = await supabase.from("courses").insert({ ...payload, spots_left: courseForm.spots }).select("id").single();
      if (data) courseId = data.id;
      toast({ title: "Cours créé" });
    }

    // Insert schedules
    if (courseId) {
      const scheduleRows = courseForm.schedules.map(s => ({
        course_id: courseId!,
        day: s.day,
        time: s.time,
        end_time: s.end_time,
      }));
      await supabase.from("course_schedules").insert(scheduleRows);
    }

    setDialogOpen(false);
    fetchData();
  };

  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    toast({ title: "Cours supprimé", variant: "destructive" });
    fetchData();
  };

  // Schedule form helpers
  const addScheduleSlot = () => {
    setCourseForm(prev => ({
      ...prev,
      schedules: [...prev.schedules, { day: "Lundi", time: "09:00", end_time: "10:00" }],
    }));
  };
  const removeScheduleSlot = (idx: number) => {
    setCourseForm(prev => ({
      ...prev,
      schedules: prev.schedules.filter((_, i) => i !== idx),
    }));
  };
  const updateScheduleSlot = (idx: number, field: keyof Schedule, value: string) => {
    setCourseForm(prev => ({
      ...prev,
      schedules: prev.schedules.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  };

  // === WORKSHOP CRUD ===
  const openNewWorkshop = (category: string) => {
    setEditingId(null);
    setWorkshopForm({ ...emptyWorkshopForm, category });
    setDialogType("workshop");
    setDialogOpen(true);
  };
  const openEditWorkshop = (w: Workshop) => {
    setEditingId(w.id);
    setWorkshopForm({ name: w.name, description: w.description, category: w.category, date: w.date, time: w.time, end_time: w.end_time || "", frequency: w.frequency || "ponctuel", price: w.price, spots: w.spots, image: w.image });
    setDialogType("workshop");
    setDialogOpen(true);
  };
  const saveWorkshop = async () => {
    const duration = calcDuration(workshopForm.time, workshopForm.end_time);
    const payload = { ...workshopForm, duration };
    if (editingId) {
      await supabase.from("workshops").update(payload).eq("id", editingId);
      toast({ title: "Atelier modifié" });
    } else {
      await supabase.from("workshops").insert({ ...payload, spots_left: workshopForm.spots });
      toast({ title: "Atelier créé" });
    }
    setDialogOpen(false);
    fetchData();
  };
  const deleteWorkshop = async (id: string) => {
    await supabase.from("workshops").delete().eq("id", id);
    toast({ title: "Atelier supprimé", variant: "destructive" });
    fetchData();
  };

  const workshopDuration = calcDuration(workshopForm.time, workshopForm.end_time);
  const potteryWorkshops = workshops.filter(w => w.category === "poterie");
  const wellbeingWorkshops = workshops.filter(w => w.category === "bien-etre");

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-foreground" : "text-muted-foreground/40"}`} />
      </span>
    </th>
  );

  if (loading) {
    return (
      <AdminLayout title="Activités">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Activités">
      <Tabs defaultValue="yoga" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="yoga">Yoga & Pilates</TabsTrigger>
          <TabsTrigger value="poterie">Poterie</TabsTrigger>
          <TabsTrigger value="ateliers">Ateliers</TabsTrigger>
        </TabsList>

        {/* === YOGA TAB === */}
        <TabsContent value="yoga" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{courses.length} cours programmés</p>
            <Button size="sm" className="gap-1.5" onClick={openNewCourse}>
              <Plus className="h-4 w-4" /> Ajouter un cours
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <SortHeader label="Cours" field="name" />
                  <SortHeader label="Créneaux" field="day" />
                  <SortHeader label="Fréquence" field="frequency" />
                  <SortHeader label="Places" field="spots" />
                  <SortHeader label="Intervenant" field="instructor" />
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-3">
                      <div className="font-medium">{c.name}</div>
                      {c.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</div>}
                    </td>
                    <td className="p-3">
                      {c.schedules && c.schedules.length > 0 ? (
                        <div className="space-y-1">
                          {c.schedules.map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <Badge variant="outline" className="text-xs font-normal">{s.day.slice(0, 3)}</Badge>
                              <span className="text-muted-foreground">{s.time}{s.end_time ? ` - ${s.end_time}` : ""}</span>
                              {s.time && s.end_time && (
                                <span className="text-muted-foreground/60">· {calcDuration(s.time, s.end_time)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span>{c.day} {c.time}{c.end_time ? ` - ${c.end_time}` : ""}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs capitalize">{c.frequency || "hebdomadaire"}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={c.spots_left === 0 ? "destructive" : "secondary"} className="text-xs">
                        {c.spots_left}/{c.spots}
                      </Badge>
                    </td>
                    <td className="p-3">{c.instructor}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditCourse(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteCourse(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* === POTERIE TAB === */}
        <TabsContent value="poterie" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{potteryWorkshops.length} ateliers poterie</p>
            <Button size="sm" className="gap-1.5" onClick={() => openNewWorkshop("poterie")}>
              <Plus className="h-4 w-4" /> Ajouter un atelier
            </Button>
          </div>
          <WorkshopTable workshops={potteryWorkshops} onEdit={openEditWorkshop} onDelete={deleteWorkshop} />
        </TabsContent>

        {/* === ATELIERS TAB === */}
        <TabsContent value="ateliers" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{wellbeingWorkshops.length} ateliers bien-être</p>
            <Button size="sm" className="gap-1.5" onClick={() => openNewWorkshop("bien-etre")}>
              <Plus className="h-4 w-4" /> Ajouter un atelier
            </Button>
          </div>
          <WorkshopTable workshops={wellbeingWorkshops} onEdit={openEditWorkshop} onDelete={deleteWorkshop} />
        </TabsContent>
      </Tabs>

      {/* === DIALOG === */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Modifier" : "Nouveau"} {dialogType === "course" ? "cours" : "atelier"}
            </DialogTitle>
          </DialogHeader>

          {dialogType === "course" ? (
            <div className="space-y-4 pt-2">
              <div><Label>Nom du cours</Label><Input value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="Vinyasa Flow" /></div>
              <div><Label>Description</Label><Textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} rows={2} placeholder="Description du cours visible sur le site..." /></div>
              <div>
                <Label>Fréquence</Label>
                <Select value={courseForm.frequency} onValueChange={v => setCourseForm({ ...courseForm, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* === SCHEDULE SLOTS === */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="mb-0">Créneaux horaires</Label>
                  <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addScheduleSlot}>
                    <Plus className="h-3 w-3" /> Ajouter un créneau
                  </Button>
                </div>
                <div className="space-y-2">
                  {courseForm.schedules.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
                      <Select value={slot.day} onValueChange={v => updateScheduleSlot(idx, "day", v)}>
                        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="time" className="w-[100px] h-8 text-xs" value={slot.time} onChange={e => updateScheduleSlot(idx, "time", e.target.value)} />
                      <span className="text-muted-foreground text-xs">→</span>
                      <Input type="time" className="w-[100px] h-8 text-xs" value={slot.end_time} onChange={e => updateScheduleSlot(idx, "end_time", e.target.value)} />
                      {slot.time && slot.end_time && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{calcDuration(slot.time, slot.end_time)}</span>
                      )}
                      {courseForm.schedules.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeScheduleSlot(idx)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Places</Label><Input type="number" value={courseForm.spots} onChange={e => setCourseForm({ ...courseForm, spots: Number(e.target.value) })} /></div>
                <div><Label>Intervenant</Label><Input value={courseForm.instructor} onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={saveCourse} disabled={!courseForm.name || courseForm.schedules.length === 0}>{editingId ? "Enregistrer" : "Créer le cours"}</Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div><Label>Nom</Label><Input value={workshopForm.name} onChange={e => setWorkshopForm({ ...workshopForm, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={workshopForm.description} onChange={e => setWorkshopForm({ ...workshopForm, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Catégorie</Label>
                  <Select value={workshopForm.category} onValueChange={v => setWorkshopForm({ ...workshopForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poterie">Poterie</SelectItem>
                      <SelectItem value="bien-etre">Bien-être</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Fréquence</Label>
                  <Select value={workshopForm.frequency} onValueChange={v => setWorkshopForm({ ...workshopForm, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Date</Label><Input type="date" value={workshopForm.date} onChange={e => setWorkshopForm({ ...workshopForm, date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Heure de début</Label><Input type="time" value={workshopForm.time} onChange={e => setWorkshopForm({ ...workshopForm, time: e.target.value })} /></div>
                <div><Label>Heure de fin</Label><Input type="time" value={workshopForm.end_time} onChange={e => setWorkshopForm({ ...workshopForm, end_time: e.target.value })} /></div>
              </div>
              {workshopDuration && (
                <div className="text-sm text-muted-foreground">Durée calculée : <span className="font-medium text-foreground">{workshopDuration}</span></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prix (€)</Label><Input type="number" value={workshopForm.price} onChange={e => setWorkshopForm({ ...workshopForm, price: Number(e.target.value) })} /></div>
                <div><Label>Places</Label><Input type="number" value={workshopForm.spots} onChange={e => setWorkshopForm({ ...workshopForm, spots: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Image URL</Label><Input value={workshopForm.image} onChange={e => setWorkshopForm({ ...workshopForm, image: e.target.value })} placeholder="https://..." /></div>
              <Button className="w-full" onClick={saveWorkshop} disabled={!workshopForm.name || !workshopForm.date}>{editingId ? "Enregistrer" : "Créer l'atelier"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function WorkshopTable({ workshops, onEdit, onDelete }: { workshops: Workshop[]; onEdit: (w: Workshop) => void; onDelete: (id: string) => void }) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 font-medium text-muted-foreground">Atelier</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Horaires</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Fréquence</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Prix</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Places</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workshops.map((w) => (
            <tr key={w.id} className="border-b last:border-0 hover:bg-muted/10">
              <td className="p-3">
                <div className="font-medium">{w.name}</div>
                {w.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{w.description}</div>}
              </td>
              <td className="p-3">{new Date(w.date).toLocaleDateString("fr-FR")}</td>
              <td className="p-3">{w.time}{w.end_time ? ` - ${w.end_time}` : ""} · {w.duration}</td>
              <td className="p-3">
                <Badge variant="outline" className="text-xs capitalize">{w.frequency || "ponctuel"}</Badge>
              </td>
              <td className="p-3">{w.price}€</td>
              <td className="p-3">
                <Badge variant={w.spots_left === 0 ? "destructive" : "secondary"} className="text-xs">
                  {w.spots_left}/{w.spots}
                </Badge>
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(w.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
