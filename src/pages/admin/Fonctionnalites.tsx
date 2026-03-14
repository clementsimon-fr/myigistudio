import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Lightbulb, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  urgency: number;
  status: string;
  created_at: string;
}

const URGENCY_CONFIG: Record<number, { label: string; delay: string; color: string }> = {
  1: { label: "Urgent", delay: "< 24h", color: "bg-destructive/15 text-destructive border-destructive/30" },
  2: { label: "Important", delay: "< 3 jours", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  3: { label: "Cool", delay: "< 1 semaine", color: "bg-primary/15 text-primary-dark border-primary/30" },
};

const STATUS_OPTIONS = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminé" },
];

export default function AdminFonctionnalites() {
  const { toast } = useToast();
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", urgency: 3 });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_requests").select("*").order("urgency").order("created_at", { ascending: false });
    if (data) setItems(data as unknown as FeatureRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    await supabase.from("feature_requests").insert({ title: form.title, description: form.description, urgency: form.urgency } as any);
    toast({ title: "Idée ajoutée ✓" });
    setDialogOpen(false);
    setForm({ title: "", description: "", urgency: 3 });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("feature_requests").update({ status } as any).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
  };

  const deleteItem = async (id: string) => {
    await supabase.from("feature_requests").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast({ title: "Supprimé" });
  };

  const todoItems = items.filter(i => i.status === "todo");
  const inProgressItems = items.filter(i => i.status === "in_progress");
  const doneItems = items.filter(i => i.status === "done");

  if (loading) {
    return (
      <AdminLayout title="Fonctionnalités">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fonctionnalités">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{items.length} idée{items.length > 1 ? "s" : ""} d'amélioration</p>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle idée
        </Button>
      </div>

      {/* Kanban-style columns */}
      <div className="grid md:grid-cols-3 gap-4">
        <KanbanColumn title="À faire" icon={<Lightbulb className="h-4 w-4" />} items={todoItems} onStatusChange={updateStatus} onDelete={deleteItem} />
        <KanbanColumn title="En cours" icon={<Loader2 className="h-4 w-4" />} items={inProgressItems} onStatusChange={updateStatus} onDelete={deleteItem} />
        <KanbanColumn title="Terminé" icon={<CheckCircle2 className="h-4 w-4" />} items={doneItems} onStatusChange={updateStatus} onDelete={deleteItem} />
      </div>

      {/* New idea dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Lightbulb className="h-5 w-5" /> Nouvelle idée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ajouter un système de..." /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Détails de l'amélioration..." /></div>
            <div>
              <Label>Niveau d'importance</Label>
              <Select value={String(form.urgency)} onValueChange={v => setForm({ ...form, urgency: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(URGENCY_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label} ({cfg.delay})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={save} disabled={!form.title.trim()}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function KanbanColumn({ title, icon, items, onStatusChange, onDelete }: {
  title: string;
  icon: React.ReactNode;
  items: FeatureRequest[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-primary-dark">
        {icon} {title}
        <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune idée</p>}
        {items.map(item => {
          const urgCfg = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG[3];
          return (
            <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium leading-tight">{item.title}</h4>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => onDelete(item.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${urgCfg.color}`}>{urgCfg.label} · {urgCfg.delay}</Badge>
                <Select value={item.status} onValueChange={v => onStatusChange(item.id, v)}>
                  <SelectTrigger className="h-6 text-[10px] w-auto min-w-[80px] border-dashed"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
