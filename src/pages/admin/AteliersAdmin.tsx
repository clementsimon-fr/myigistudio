import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { workshops, type Workshop } from "@/data/mockData";

export default function AteliersAdmin() {
  const [ateliers, setAteliers] = useState<Workshop[]>(workshops);
  const [editing, setEditing] = useState<Workshop | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const emptyForm = { name: "", description: "", date: "", time: "14:00", duration: "2h", price: 0, spots: 8, category: "poterie" as "poterie" | "bien-etre", image: "" };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setEditing(null); setForm(emptyForm); setIsOpen(true); };
  const openEdit = (w: Workshop) => {
    setEditing(w);
    setForm({ name: w.name, description: w.description, date: w.date, time: w.time, duration: w.duration, price: w.price, spots: w.spots, category: w.category, image: w.image });
    setIsOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      setAteliers(ateliers.map((a) => a.id === editing.id ? { ...a, ...form } : a));
    } else {
      setAteliers([...ateliers, { id: `w-${Date.now()}`, ...form, spotsLeft: form.spots }]);
    }
    setIsOpen(false);
  };

  const handleDelete = (id: string) => setAteliers(ateliers.filter((a) => a.id !== id));

  return (
    <AdminLayout title="Gestion des Ateliers">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{ateliers.length} ateliers</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Ajouter un atelier</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Modifier l'atelier" : "Nouvel atelier"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v: "poterie" | "bien-etre") => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="poterie">Poterie</SelectItem>
                      <SelectItem value="bien-etre">Bien-être</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Heure</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
                <div><Label>Durée</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
                <div><Label>Prix (€)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Places</Label><Input type="number" value={form.spots} onChange={(e) => setForm({ ...form, spots: Number(e.target.value) })} /></div>
              <div><Label>Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." /></div>
              <Button className="w-full" onClick={handleSave} disabled={!form.name || !form.date}>{editing ? "Enregistrer" : "Créer l'atelier"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Atelier</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Catégorie</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Prix</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Places</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ateliers.map((a) => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/10">
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3"><Badge variant="secondary" className="text-xs">{a.category}</Badge></td>
                <td className="p-3">{new Date(a.date).toLocaleDateString("fr-FR")}</td>
                <td className="p-3">{a.price}€</td>
                <td className="p-3">{a.spotsLeft}/{a.spots}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
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
