import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { yogaSchedule, type CourseSchedule } from "@/data/mockData";

export default function AdminCours() {
  const [courses, setCourses] = useState<CourseSchedule[]>(yogaSchedule);
  const [editingCourse, setEditingCourse] = useState<CourseSchedule | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", day: "Mardi", time: "09:00", duration: "1h", instructor: "Élodie", spots: 12,
  });

  const openNew = () => {
    setEditingCourse(null);
    setForm({ name: "", day: "Mardi", time: "09:00", duration: "1h", instructor: "Élodie", spots: 12 });
    setIsOpen(true);
  };

  const openEdit = (c: CourseSchedule) => {
    setEditingCourse(c);
    setForm({ name: c.name, day: c.day, time: c.time, duration: c.duration, instructor: c.instructor, spots: c.spots });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (editingCourse) {
      setCourses(courses.map((c) => c.id === editingCourse.id ? { ...c, ...form } : c));
    } else {
      setCourses([...courses, { id: `new-${Date.now()}`, ...form, spotsLeft: form.spots }]);
    }
    setIsOpen(false);
  };

  const handleDelete = (id: string) => {
    setCourses(courses.filter((c) => c.id !== id));
  };

  const days = ["Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  return (
    <AdminLayout title="Gestion des Cours">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{courses.length} cours programmés</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="h-4 w-4" /> Ajouter un cours
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editingCourse ? "Modifier le cours" : "Nouveau cours"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nom du cours</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vinyasa Flow" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Jour</Label>
                  <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{days.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Heure</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Durée</Label>
                  <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="1h15" />
                </div>
                <div>
                  <Label>Places</Label>
                  <Input type="number" value={form.spots} onChange={(e) => setForm({ ...form, spots: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Instructeur</Label>
                <Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={!form.name}>
                {editingCourse ? "Enregistrer" : "Créer le cours"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  <Badge variant={c.spotsLeft === 0 ? "destructive" : "secondary"} className="text-xs">
                    {c.spotsLeft}/{c.spots}
                  </Badge>
                </td>
                <td className="p-3">{c.instructor}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
