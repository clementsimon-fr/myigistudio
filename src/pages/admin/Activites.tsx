import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  name: string;
  category: string;
  day: string;
  time: string;
  duration: string;
  instructor: string;
  spots: number;
  spots_left: number;
}

interface Workshop {
  id: string;
  name: string;
  description: string;
  category: string;
  date: string;
  time: string;
  duration: string;
  price: number;
  spots: number;
  spots_left: number;
  image: string;
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function AdminActivites() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"course" | "workshop">("course");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Course form
  const emptyCourseForm = { name: "", category: "yoga", day: "Mardi", time: "09:00", duration: "1h", instructor: "Élodie", spots: 12 };
  const [courseForm, setCourseForm] = useState(emptyCourseForm);

  // Workshop form
  const emptyWorkshopForm = { name: "", description: "", category: "poterie", date: "", time: "14:00", duration: "2h", price: 0, spots: 8, image: "" };
  const [workshopForm, setWorkshopForm] = useState(emptyWorkshopForm);

  const fetchData = async () => {
    setLoading(true);
    const [coursesRes, workshopsRes] = await Promise.all([
      supabase.from("courses").select("*").order("day").order("time"),
      supabase.from("workshops").select("*").order("date"),
    ]);
    if (coursesRes.data) setCourses(coursesRes.data as Course[]);
    if (workshopsRes.data) setWorkshops(workshopsRes.data as Workshop[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // === COURSE CRUD ===
  const openNewCourse = () => {
    setEditingId(null);
    setCourseForm(emptyCourseForm);
    setDialogType("course");
    setDialogOpen(true);
  };
  const openEditCourse = (c: Course) => {
    setEditingId(c.id);
    setCourseForm({ name: c.name, category: c.category, day: c.day, time: c.time, duration: c.duration, instructor: c.instructor, spots: c.spots });
    setDialogType("course");
    setDialogOpen(true);
  };
  const saveCourse = async () => {
    if (editingId) {
      await supabase.from("courses").update(courseForm).eq("id", editingId);
      toast({ title: "Cours modifié" });
    } else {
      await supabase.from("courses").insert({ ...courseForm, spots_left: courseForm.spots });
      toast({ title: "Cours créé" });
    }
    setDialogOpen(false);
    fetchData();
  };
  const deleteCourse = async (id: string) => {
    await supabase.from("courses").delete().eq("id", id);
    toast({ title: "Cours supprimé", variant: "destructive" });
    fetchData();
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
    setWorkshopForm({ name: w.name, description: w.description, category: w.category, date: w.date, time: w.time, duration: w.duration, price: w.price, spots: w.spots, image: w.image });
    setDialogType("workshop");
    setDialogOpen(true);
  };
  const saveWorkshop = async () => {
    if (editingId) {
      await supabase.from("workshops").update(workshopForm).eq("id", editingId);
      toast({ title: "Atelier modifié" });
    } else {
      await supabase.from("workshops").insert({ ...workshopForm, spots_left: workshopForm.spots });
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

  const potteryWorkshops = workshops.filter(w => w.category === "poterie");
  const wellbeingWorkshops = workshops.filter(w => w.category === "bien-etre");

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
                  <th className="text-left p-3 font-medium text-muted-foreground">Cours</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Jour</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Heure</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Durée</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Places</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Instructeur</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.day}</td>
                    <td className="p-3">{c.time}</td>
                    <td className="p-3">{c.duration}</td>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Modifier" : "Nouveau"} {dialogType === "course" ? "cours" : "atelier"}
            </DialogTitle>
          </DialogHeader>

          {dialogType === "course" ? (
            <div className="space-y-4 pt-2">
              <div><Label>Nom du cours</Label><Input value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} placeholder="Vinyasa Flow" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Jour</Label>
                  <Select value={courseForm.day} onValueChange={v => setCourseForm({ ...courseForm, day: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Heure</Label><Input type="time" value={courseForm.time} onChange={e => setCourseForm({ ...courseForm, time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Durée</Label><Input value={courseForm.duration} onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })} placeholder="1h15" /></div>
                <div><Label>Places</Label><Input type="number" value={courseForm.spots} onChange={e => setCourseForm({ ...courseForm, spots: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Instructeur</Label><Input value={courseForm.instructor} onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })} /></div>
              <Button className="w-full" onClick={saveCourse} disabled={!courseForm.name}>{editingId ? "Enregistrer" : "Créer le cours"}</Button>
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
                <div><Label>Date</Label><Input type="date" value={workshopForm.date} onChange={e => setWorkshopForm({ ...workshopForm, date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Heure</Label><Input type="time" value={workshopForm.time} onChange={e => setWorkshopForm({ ...workshopForm, time: e.target.value })} /></div>
                <div><Label>Durée</Label><Input value={workshopForm.duration} onChange={e => setWorkshopForm({ ...workshopForm, duration: e.target.value })} /></div>
                <div><Label>Prix (€)</Label><Input type="number" value={workshopForm.price} onChange={e => setWorkshopForm({ ...workshopForm, price: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Places</Label><Input type="number" value={workshopForm.spots} onChange={e => setWorkshopForm({ ...workshopForm, spots: Number(e.target.value) })} /></div>
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
            <th className="text-left p-3 font-medium text-muted-foreground">Prix</th>
            <th className="text-left p-3 font-medium text-muted-foreground">Places</th>
            <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workshops.map((w) => (
            <tr key={w.id} className="border-b last:border-0 hover:bg-muted/10">
              <td className="p-3 font-medium">{w.name}</td>
              <td className="p-3">{new Date(w.date).toLocaleDateString("fr-FR")}</td>
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
