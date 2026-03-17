import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Condition {
  id: string;
  type: string;
  title: string;
  content: string;
  applies_to: string[];
  sort_order: number;
  active: boolean;
  created_at: string;
}

const CONDITION_TYPES = [
  { value: "annulation", label: "Conditions d'annulation" },
  { value: "generale", label: "Conditions générales" },
  { value: "myigistudio", label: "Conditions MyIgiStudio" },
];

const ACTIVITY_OPTIONS = [
  { value: "yoga", label: "Yoga & Pilates" },
  { value: "poterie", label: "Poterie" },
  { value: "bien-etre", label: "Ateliers & Stages" },
];

const emptyCondition: Omit<Condition, "id" | "created_at"> = {
  type: "annulation",
  title: "",
  content: "",
  applies_to: ["yoga", "poterie", "bien-etre"],
  sort_order: 0,
  active: true,
};

export default function AdminConditions() {
  const { toast } = useToast();
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Condition | null>(null);
  const [form, setForm] = useState(emptyCondition);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchConditions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conditions")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setConditions(data as unknown as Condition[]);
    setLoading(false);
  };

  useEffect(() => { fetchConditions(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyCondition, sort_order: conditions.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (c: Condition) => {
    setEditing(c);
    setForm({ type: c.type, title: c.title, content: c.content, applies_to: c.applies_to, sort_order: c.sort_order, active: c.active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    if (editing) {
      await supabase.from("conditions").update({
        type: form.type,
        title: form.title,
        content: form.content,
        applies_to: form.applies_to,
        sort_order: form.sort_order,
        active: form.active,
      } as any).eq("id", editing.id);
      toast({ title: "Condition mise à jour ✓" });
    } else {
      await supabase.from("conditions").insert({
        type: form.type,
        title: form.title,
        content: form.content,
        applies_to: form.applies_to,
        sort_order: form.sort_order,
        active: form.active,
      } as any);
      toast({ title: "Condition créée ✓" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchConditions();
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await supabase.from("conditions").delete().eq("id", deletingId);
    toast({ title: "Condition supprimée", variant: "destructive" });
    setDeletingId(null);
    fetchConditions();
  };

  const toggleAppliesTo = (val: string) => {
    setForm(prev => ({
      ...prev,
      applies_to: prev.applies_to.includes(val)
        ? prev.applies_to.filter(v => v !== val)
        : [...prev.applies_to, val],
    }));
  };

  if (loading) {
    return (
      <AdminLayout title="Conditions">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Conditions">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Gérez les conditions affichées lors de la réservation et sur le site.
        </p>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      <div className="space-y-4">
        {conditions.map(c => (
          <div key={c.id} className={`rounded-xl border bg-card p-4 md:p-6 ${!c.active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary-dark" />
                  <h3 className="font-semibold text-primary-dark">{c.title || CONDITION_TYPES.find(t => t.value === c.type)?.label || c.type}</h3>
                  {!c.active && <Badge variant="outline" className="text-[10px]">Désactivée</Badge>}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {c.applies_to.map(a => (
                    <Badge key={a} variant="secondary" className="text-[10px]">
                      {ACTIVITY_OPTIONS.find(o => o.value === a)?.label || a}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
              {c.content || <span className="italic">Aucun contenu</span>}
            </p>
          </div>
        ))}

        {conditions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucune condition configurée.
          </div>
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la condition" : "Nouvelle condition"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDITION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Titre</Label>
              <Input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Conditions d'annulation"
              />
            </div>
            <div>
              <Label className="text-sm">Contenu</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                placeholder="Texte de la condition..."
              />
            </div>
            <div>
              <Label className="text-sm mb-2 block">S'applique aux activités</Label>
              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map(opt => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.applies_to.includes(opt.value)}
                      onCheckedChange={() => toggleAppliesTo(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Afficher cette condition</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm(prev => ({ ...prev, active: v }))}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {editing && (
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => { setDialogOpen(false); handleDelete(editing.id); }}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editing ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
