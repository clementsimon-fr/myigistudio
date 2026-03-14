import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Lightbulb, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  urgency: number;
  status: string;
  target: string;
  impact: string;
  ticket_group: string | null;
  created_at: string;
}

const URGENCY_CONFIG: Record<number, { label: string; delay: string; color: string }> = {
  1: { label: "Urgent", delay: "< 24h", color: "bg-destructive/15 text-destructive border-destructive/30" },
  2: { label: "Important", delay: "< 3 jours", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  3: { label: "Cool", delay: "< 1 semaine", color: "bg-primary/15 text-primary-dark border-primary/30" },
  4: { label: "À discuter", delay: "à l'occasion", color: "bg-muted text-muted-foreground border-muted-foreground/20" },
};

const IMPACT_CONFIG: Record<string, { label: string; examples: string; cost: string; color: string }> = {
  retouche: {
    label: "Retouche",
    examples: "Changer un texte, une couleur, une image, corriger une faute",
    cost: "Inclus",
    color: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  },
  amelioration: {
    label: "Amélioration",
    examples: "Ajouter une section, réorganiser un bloc, modifier un formulaire",
    cost: "Inclus",
    color: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  },
  fonctionnalite: {
    label: "Création",
    examples: "Système de chat, bons cadeaux multiples, nouveau module",
    cost: "50€ / ticket",
    color: "bg-violet-500/15 text-violet-700 border-violet-500/30",
  },
};

const TARGET_OPTIONS = [
  { value: "visiteur", label: "Espace visiteur" },
  { value: "client", label: "Espace client" },
  { value: "admin", label: "Espace Admin" },
  { value: "autre", label: "Autre" },
];

const STATUS_OPTIONS = [
  { value: "todo", label: "À faire" },
  { value: "in_progress", label: "En cours" },
  { value: "done", label: "Terminé" },
];

function getCostLabel(impact: string, urgency: number): { text: string; detail: string } {
  if (urgency === 4) return { text: "Sur devis", detail: "Cette demande sera discutée et chiffrée sur mesure." };
  if (impact === "fonctionnalite") return { text: "20€", detail: "Cette fonctionnalité sera facturée en tant que ticket." };
  if (urgency === 1) return { text: "Inclus", detail: "Groupée avec vos autres demandes urgentes du jour." };
  return { text: "Inclus", detail: "Inclus dans votre quota hebdomadaire." };
}

function generateTicketGroup(urgency: number, impact: string): string | null {
  if (urgency === 1) {
    const today = new Date().toISOString().slice(0, 10);
    return `urgent-${today}`;
  }
  return null;
}

export default function AdminFonctionnalites() {
  const { toast } = useToast();
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", urgency: 3, target: "autre", impact: "retouche" });

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_requests").select("*").order("urgency").order("created_at", { ascending: false });
    if (data) setItems(data as unknown as FeatureRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    const ticket_group = generateTicketGroup(form.urgency, form.impact);
    await supabase.from("feature_requests").insert({
      title: form.title,
      description: form.description,
      urgency: form.urgency,
      target: form.target,
      impact: form.impact,
      ticket_group,
    } as any);
    toast({ title: "Idée ajoutée ✓" });
    setDialogOpen(false);
    setForm({ title: "", description: "", urgency: 3, target: "autre", impact: "retouche" });
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

  const costInfo = getCostLabel(form.impact, form.urgency);

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

      <div className="grid md:grid-cols-3 gap-4">
        <KanbanColumn title="À faire" icon={<Lightbulb className="h-4 w-4" />} items={todoItems} onStatusChange={updateStatus} onDelete={deleteItem} />
        <KanbanColumn title="En cours" icon={<Loader2 className="h-4 w-4" />} items={inProgressItems} onStatusChange={updateStatus} onDelete={deleteItem} />
        <KanbanColumn title="Terminé" icon={<CheckCircle2 className="h-4 w-4" />} items={doneItems} onStatusChange={updateStatus} onDelete={deleteItem} />
      </div>

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
              <Label>Pour qui ?</Label>
              <Select value={form.target} onValueChange={v => setForm({ ...form, target: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
            <div>
              <Label>Type de demande</Label>
              <Select value={form.impact} onValueChange={v => setForm({ ...form, impact: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>
                      <span className="font-medium">{cfg.label}</span>
                      <span className="text-muted-foreground ml-1 text-xs">— {cfg.examples}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost recap */}
            <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-primary-dark">{costInfo.text}</span>
                <span className="text-muted-foreground ml-1">— {costInfo.detail}</span>
              </div>
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
          const impactCfg = IMPACT_CONFIG[item.impact] || IMPACT_CONFIG["retouche"];
          const targetLabel = TARGET_OPTIONS.find(t => t.value === item.target)?.label || item.target;
          const cost = getCostLabel(item.impact, item.urgency);
          return (
            <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium leading-tight">{item.title}</h4>
                <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => onDelete(item.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${urgCfg.color}`}>{urgCfg.label}</Badge>
                <Badge variant="outline" className={`text-[10px] ${impactCfg.color}`}>{impactCfg.label} · {cost.text}</Badge>
                <Badge variant="secondary" className="text-[10px]">{targetLabel}</Badge>
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
