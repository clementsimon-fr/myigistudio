import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
  validity: string;
  popular: boolean;
  sort_order: number;
}

export default function AdminTarifs() {
  const { toast } = useToast();
  const [cards, setCards] = useState<PricingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyForm = { name: "", sessions: 10, price: 0, validity: "3 mois", popular: false, sort_order: 0 };
  const [form, setForm] = useState(emptyForm);

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await supabase.from("pricing_cards").select("*").order("sort_order");
    if (data) setCards(data as unknown as PricingCard[]);
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, []);

  const openNew = () => { setEditingId(null); setForm({ ...emptyForm, sort_order: cards.length }); setDialogOpen(true); };
  const openEdit = (c: PricingCard) => {
    setEditingId(c.id);
    setForm({ name: c.name, sessions: c.sessions, price: c.price, validity: c.validity, popular: c.popular, sort_order: c.sort_order });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { name: form.name, sessions: form.sessions, price: form.price, validity: form.validity, popular: form.popular, sort_order: form.sort_order };
    if (editingId) {
      await supabase.from("pricing_cards").update(payload as any).eq("id", editingId);
    } else {
      await supabase.from("pricing_cards").insert(payload as any);
    }
    toast({ title: editingId ? "Tarif modifié" : "Tarif ajouté" });
    setDialogOpen(false);
    fetchCards();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await supabase.from("pricing_cards").delete().eq("id", deletingId);
    toast({ title: "Tarif supprimé" });
    setDeletingId(null);
    fetchCards();
  };

  const unitPrice = (c: PricingCard) => c.sessions > 0 ? (c.price / c.sessions).toFixed(2) : "—";

  if (loading) {
    return <AdminLayout title="Tarifs"><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout title="Tarifs">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">Gérez les cartes de cours affichées sur la page Yoga.</p>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter un tarif</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.id} className={`relative rounded-xl border p-5 bg-card ${c.popular ? "border-primary-dark ring-2 ring-primary-dark/20" : ""}`}>
            {c.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" /> Populaire
              </div>
            )}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-semibold text-primary-dark">{c.name}</h3>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{c.price}€</span>
                  <span className="text-sm text-muted-foreground ml-1">
                    · {c.sessions >= 9999 ? "Illimité" : `${c.sessions} cours`} · {c.validity}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.sessions < 9999 ? `${unitPrice(c)}€ / cours` : "Accès illimité"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingId(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le tarif" : "Nouveau tarif"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Régulier" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre de cours</Label>
                <Input type="number" value={form.sessions} onChange={e => setForm({ ...form, sessions: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">9999 = illimité</p>
              </div>
              <div>
                <Label>Prix (€)</Label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Validité</Label>
                <Input value={form.validity} onChange={e => setForm({ ...form, validity: e.target.value })} placeholder="3 mois" />
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.popular} onCheckedChange={v => setForm({ ...form, popular: v })} />
              <Label>Marquer comme "Populaire"</Label>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!form.name}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
