import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Gift, Copy, Check, Search, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Voucher {
  id: string;
  code: string;
  type: string;
  amount: number;
  card_name: string;
  sessions: number;
  beneficiary_name: string;
  buyer_name: string;
  message: string;
  used: boolean;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  price: number;
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "IGI-";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

type StatusFilter = "all" | "active" | "used" | "expired";

export default function AdminBonsCadeaux() {
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [existingClients, setExistingClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const emptyForm = {
    type: "amount" as "amount" | "card",
    amount: 0,
    card_name: "",
    sessions: 0,
    beneficiary_name: "",
    buyer_name: "",
    message: "",
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    buyer_is_existing: false,
    beneficiary_is_existing: false,
  };
  const [form, setForm] = useState(emptyForm);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [beneficiarySearch, setBeneficiarySearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [vRes, pRes, clientsRes] = await Promise.all([
      supabase.from("gift_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("pricing_cards").select("id, name, sessions, price").order("sort_order"),
      supabase.from("reservations").select("client_name"),
    ]);
    if (vRes.data) setVouchers(vRes.data as unknown as Voucher[]);
    if (pRes.data) setPricingCards(pRes.data as unknown as PricingCard[]);
    if (clientsRes.data) {
      const unique = [...new Set(clientsRes.data.map(r => r.client_name).filter(Boolean))].sort();
      setExistingClients(unique);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setBuyerSearch(""); setBeneficiarySearch(""); setDialogOpen(true); };
  const openEdit = (v: Voucher) => {
    setEditingId(v.id);
    setForm({
      type: v.type as "amount" | "card",
      amount: v.amount,
      card_name: v.card_name,
      sessions: v.sessions,
      beneficiary_name: v.beneficiary_name,
      buyer_name: v.buyer_name,
      message: v.message,
      expires_at: v.expires_at,
      buyer_is_existing: false,
      beneficiary_is_existing: false,
    });
    setBuyerSearch(v.buyer_name);
    setBeneficiarySearch(v.beneficiary_name);
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = {
      type: form.type,
      amount: form.amount,
      card_name: form.card_name,
      sessions: form.sessions,
      beneficiary_name: form.beneficiary_name,
      buyer_name: form.buyer_name,
      message: form.message,
      expires_at: form.expires_at,
    };
    if (editingId) {
      await supabase.from("gift_vouchers").update(payload).eq("id", editingId);
      toast({ title: "Bon cadeau modifié" });
    } else {
      await supabase.from("gift_vouchers").insert({ ...payload, code: generateCode() });
      toast({ title: "Bon cadeau créé ✓" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const toggleUsed = async (v: Voucher) => {
    if (v.used) {
      await supabase.from("gift_vouchers").update({ used: false, used_at: null }).eq("id", v.id);
    } else {
      await supabase.from("gift_vouchers").update({ used: true, used_at: new Date().toISOString() }).eq("id", v.id);
    }
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await supabase.from("gift_vouchers").delete().eq("id", deletingId);
    toast({ title: "Bon supprimé", variant: "destructive" });
    setDeletingId(null);
    fetchData();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const now = new Date();
  const filteredVouchers = useMemo(() => {
    let list = vouchers;
    if (statusFilter === "active") list = list.filter(v => !v.used && new Date(v.expires_at) >= now);
    else if (statusFilter === "used") list = list.filter(v => v.used);
    else if (statusFilter === "expired") list = list.filter(v => !v.used && new Date(v.expires_at) < now);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(v =>
        v.code.toLowerCase().includes(q) ||
        v.beneficiary_name.toLowerCase().includes(q) ||
        v.buyer_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vouchers, statusFilter, searchQuery]);

  const activeCount = vouchers.filter(v => !v.used && new Date(v.expires_at) >= now).length;
  const usedCount = vouchers.filter(v => v.used).length;
  const expiredCount = vouchers.filter(v => !v.used && new Date(v.expires_at) < now).length;

  const filteredBuyerClients = buyerSearch.trim() ? existingClients.filter(c => c.toLowerCase().includes(buyerSearch.toLowerCase())) : existingClients;
  const filteredBeneficiaryClients = beneficiarySearch.trim() ? existingClients.filter(c => c.toLowerCase().includes(beneficiarySearch.toLowerCase())) : existingClients;

  if (loading) {
    return (
      <AdminLayout title="Bons Cadeaux">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Bons Cadeaux">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">{vouchers.length} bon{vouchers.length > 1 ? "s" : ""} cadeau{vouchers.length > 1 ? "x" : ""}</p>
          <div className="flex gap-1.5">
            {(["all", "active", "used", "expired"] as StatusFilter[]).map(s => (
              <Badge
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                className="text-xs cursor-pointer"
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? `Tous (${vouchers.length})` : s === "active" ? `Actifs (${activeCount})` : s === "used" ? `Utilisés (${usedCount})` : `Expirés (${expiredCount})`}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Chercher code, nom..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nouveau
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground"><Hash className="h-3.5 w-3.5 inline mr-1" />Code</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Valeur</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Bénéficiaire</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Acheteur</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Expire</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVouchers.map(v => {
              const isExpired = !v.used && new Date(v.expires_at) < now;
              return (
                <tr key={v.id} className={`border-b last:border-0 hover:bg-muted/10 ${isExpired ? "opacity-60" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{v.code}</code>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyCode(v.code, v.id)}>
                        {copiedId === v.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">{v.type === "amount" ? "Montant" : "Formule"}</Badge>
                  </td>
                  <td className="p-3 font-medium">
                    {v.type === "amount" ? `${v.amount}€` : `${v.card_name} (${v.sessions} séances)`}
                  </td>
                  <td className="p-3">{v.beneficiary_name || "—"}</td>
                  <td className="p-3">{v.buyer_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(v.expires_at).toLocaleDateString("fr-FR")}</td>
                  <td className="p-3">
                    <Badge
                      variant={v.used ? "secondary" : isExpired ? "destructive" : "default"}
                      className="text-xs cursor-pointer"
                      onClick={() => toggleUsed(v)}
                    >
                      {v.used ? `Utilisé${v.used_at ? ` le ${new Date(v.used_at).toLocaleDateString("fr-FR")}` : ""}` : isExpired ? "Expiré" : "Actif"}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeletingId(v.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredVouchers.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun bon cadeau trouvé.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Gift className="h-5 w-5" /> {editingId ? "Modifier" : "Nouveau"} bon cadeau
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Type de bon</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as "amount" | "card" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Montant libre (€)</SelectItem>
                  <SelectItem value="card">Formule / Carte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.type === "amount" ? (
              <div>
                <Label>Montant (€)</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
            ) : (
              <div>
                <Label>Formule</Label>
                <Select value={form.card_name} onValueChange={v => {
                  const card = pricingCards.find(c => c.name === v);
                  setForm({ ...form, card_name: v, sessions: card?.sessions || 0, amount: card?.price || 0 });
                }}>
                  <SelectTrigger><SelectValue placeholder="Choisir une formule..." /></SelectTrigger>
                  <SelectContent>
                    {pricingCards.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name} — {c.sessions} séances — {c.price}€</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Buyer */}
            <div>
              <Label>Acheteur</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="relative">
                  <Input
                    value={buyerSearch}
                    onChange={e => {
                      setBuyerSearch(e.target.value);
                      setForm({ ...form, buyer_name: e.target.value });
                    }}
                    placeholder="Prénom"
                  />
                  {buyerSearch.trim() && filteredBuyerClients.length > 0 && buyerSearch !== form.buyer_name && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto">
                      {filteredBuyerClients.slice(0, 5).map(c => (
                        <button key={c} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { setForm({ ...form, buyer_name: c }); setBuyerSearch(c); }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  value={form.buyer_last_name || ""}
                  onChange={e => setForm({ ...form, buyer_last_name: e.target.value })}
                  placeholder="Nom"
                />
              </div>
            </div>

            {/* Beneficiary */}
            <div>
              <Label>Bénéficiaire</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="relative">
                  <Input
                    value={beneficiarySearch}
                    onChange={e => {
                      setBeneficiarySearch(e.target.value);
                      setForm({ ...form, beneficiary_name: e.target.value });
                    }}
                    placeholder="Prénom"
                  />
                  {beneficiarySearch.trim() && filteredBeneficiaryClients.length > 0 && beneficiarySearch !== form.beneficiary_name && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-32 overflow-y-auto">
                      {filteredBeneficiaryClients.slice(0, 5).map(c => (
                        <button key={c} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent" onClick={() => { setForm({ ...form, beneficiary_name: c }); setBeneficiarySearch(c); }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  value={form.beneficiary_last_name || ""}
                  onChange={e => setForm({ ...form, beneficiary_last_name: e.target.value })}
                  placeholder="Nom"
                />
              </div>
            </div>

            <div>
              <Label>Message personnalisé</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} rows={2} placeholder="Un petit mot pour le destinataire..." />
            </div>

            <div>
              <Label>Date d'expiration</Label>
              <Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} />
            </div>

            <Button className="w-full" onClick={save} disabled={form.type === "amount" ? form.amount <= 0 : !form.card_name}>
              {editingId ? "Enregistrer" : "Créer le bon cadeau"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bon cadeau ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
