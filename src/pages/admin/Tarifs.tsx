import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Star, Save } from "lucide-react";
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
  payment_info: string;
}

export default function AdminTarifs() {
  const { toast } = useToast();
  const [cards, setCards] = useState<PricingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pricingNotes, setPricingNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const emptyForm = { name: "", sessions: 10, price: 0, validityMonths: 3, popular: false, sort_order: 0, payment_info: "" };
  const [form, setForm] = useState(emptyForm);

  // La validité est stockée en base sous forme de texte ("3 mois") pour compatibilité avec
  // l'existant, mais Élodie la saisit désormais en nombre de mois pour éviter toute ambiguïté.
  const parseValidityMonths = (validity: string): number => {
    const n = parseInt(validity.match(/(\d+)/)?.[1] || "1", 10);
    return /an|année/i.test(validity) ? n * 12 : n;
  };

  const fetchCards = async () => {
    setLoading(true);
    const [cardsRes, settingsRes] = await Promise.all([
      supabase.from("pricing_cards").select("*").order("sort_order"),
      supabase.from("site_settings").select("*").eq("key", "pricing_notes").single(),
    ]);
    if (cardsRes.data) setCards(cardsRes.data as unknown as PricingCard[]);
    if (settingsRes.data) setPricingNotes((settingsRes.data as any).value || "");
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, []);

  const openNew = () => { setEditingId(null); setForm({ ...emptyForm, sort_order: cards.length }); setDialogOpen(true); };
  const openEdit = (c: PricingCard) => {
    setEditingId(c.id);
    setForm({ name: c.name, sessions: c.sessions, price: c.price, validityMonths: parseValidityMonths(c.validity), popular: c.popular, sort_order: c.sort_order, payment_info: c.payment_info || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const validity = `${form.validityMonths} mois`;
    const payload = { name: form.name, sessions: form.sessions, price: form.price, validity, popular: form.popular, sort_order: form.sort_order, payment_info: form.payment_info };
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
    setDialogOpen(false);
    fetchCards();
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await supabase.from("site_settings").update({ value: pricingNotes } as any).eq("key", "pricing_notes");
    toast({ title: "Informations enregistrées" });
    setSavingNotes(false);
  };

  const unitPrice = (c: PricingCard) => c.sessions > 0 && c.sessions < 9999 ? (c.price / c.sessions).toFixed(2) : "—";

  if (loading) {
    return <AdminLayout title="Tarifs Yoga"><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout title="Tarifs Yoga">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">Gérez les cartes de cours affichées sur la page Yoga.</p>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Ajouter un tarif</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                {c.payment_info && (
                  <p className="text-xs text-primary mt-1 italic">{c.payment_info}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      {/* Global pricing notes */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-display font-semibold text-primary-dark mb-2">Informations générales tarifs</h3>
        <p className="text-xs text-muted-foreground mb-3">Ces informations seront affichées sous les tarifs sur le site. Utilisez un retour à la ligne pour chaque point.</p>
        <Textarea
          value={pricingNotes}
          onChange={e => setPricingNotes(e.target.value)}
          placeholder="Ex: Paiement en 2 ou 3 fois possible pour les cartes de 20 cours et plus.&#10;Les cartes sont nominatives et non remboursables."
          rows={4}
        />
        <Button onClick={handleSaveNotes} disabled={savingNotes} className="mt-3 gap-1.5" size="sm">
          <Save className="h-3.5 w-3.5" />
          {savingNotes ? "Enregistrement…" : "Enregistrer"}
        </Button>
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
                <Label>Validité (mois)</Label>
                <Input type="number" min={1} value={form.validityMonths} onChange={e => setForm({ ...form, validityMonths: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Infos de paiement</Label>
              <Input value={form.payment_info} onChange={e => setForm({ ...form, payment_info: e.target.value })} placeholder="Ex: Paiement en 2 fois possible" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.popular} onCheckedChange={v => setForm({ ...form, popular: v })} />
              <Label>Marquer comme "Populaire"</Label>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!form.name}>
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
            {editingId && (
              <Button variant="outline" className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeletingId(editingId)}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer ce tarif
              </Button>
            )}
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
