import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Loader2, Clock, Plus, Trash2, Pencil, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function makeDisplayName(firstName: string, lastName: string): string {
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  if (!fn && !ln) return "";
  if (!ln) return fn;
  return `${fn}.${ln.charAt(0).toUpperCase()}`;
}

interface AggregatedClient {
  name: string;
  totalReservations: number;
  firstReservation: string;
  profileId?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ReservationRow {
  id: string;
  activity_name: string;
  date: string;
  time: string;
  status: string;
}

interface ClientCard {
  id: string;
  client_name: string;
  card_name: string;
  total_sessions: number;
  used_sessions: number;
  expires_at: string;
}

interface PricingCard {
  id: string;
  name: string;
  sessions: number;
  validity: string;
}

interface GiftVoucher {
  id: string;
  code: string;
  type: string;
  amount: number;
  sessions: number;
  card_name: string;
  message: string;
  used: boolean;
  expires_at: string;
}

export default function AdminClients() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AggregatedClient[]>([]);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientReservations, setClientReservations] = useState<ReservationRow[]>([]);
  const [clientCards, setClientCards] = useState<ClientCard[]>([]);
  const [clientVouchers, setClientVouchers] = useState<GiftVoucher[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showAddCard, setShowAddCard] = useState(false);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [selectedPricing, setSelectedPricing] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "" });
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  const [deletingClient, setDeletingClient] = useState<AggregatedClient | null>(null);

  const loadClients = async () => {
    setLoading(true);
    const [resData, voucherData, profilesData] = await Promise.all([
      supabase.from("reservations").select("client_name, date").order("date", { ascending: true }),
      supabase.from("gift_vouchers").select("beneficiary_name, buyer_name, created_at"),
      supabase.from("profiles").select("*"),
    ]);
    const map = new Map<string, { count: number; first: string; profileId?: string; first_name?: string; last_name?: string; phone?: string; email?: string; address?: string }>();

    if (profilesData.data) {
      for (const p of profilesData.data as any[]) {
        const displayName = makeDisplayName(p.first_name, p.last_name) || p.user_name;
        map.set(displayName, {
          count: 0, first: p.created_at?.split("T")[0] || "",
          profileId: p.id, first_name: p.first_name || "", last_name: p.last_name || "",
          phone: p.phone || "", email: p.email || "", address: p.address || "",
        });
      }
    }

    if (resData.data) {
      (resData.data as any[]).forEach((r) => {
        const existing = map.get(r.client_name);
        if (existing) {
          existing.count++;
          if (!existing.first) existing.first = r.date;
        } else {
          map.set(r.client_name, { count: 1, first: r.date });
        }
      });
    }
    if (voucherData.data) {
      (voucherData.data as any[]).forEach((v) => {
        [v.beneficiary_name, v.buyer_name].filter(Boolean).forEach((name: string) => {
          if (name && !map.has(name)) {
            map.set(name, { count: 0, first: v.created_at?.split("T")[0] || "" });
          }
        });
      });
    }
    const list: AggregatedClient[] = Array.from(map.entries()).map(([name, v]) => ({
      name, totalReservations: v.count, firstReservation: v.first,
      profileId: v.profileId, first_name: v.first_name, last_name: v.last_name,
      phone: v.phone, email: v.email, address: v.address,
    }));
    setClients(list);
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, []);

  const openClientDetail = async (clientName: string) => {
    setSelectedClient(clientName);
    setLoadingDetail(true);
    const [resReservations, resCards, resVouchers] = await Promise.all([
      supabase.from("reservations").select("id, activity_name, date, time, status").eq("client_name", clientName).order("date", { ascending: false }),
      supabase.from("client_cards").select("*").eq("client_name", clientName).order("created_at", { ascending: false }),
      supabase.from("gift_vouchers").select("*").or(`beneficiary_name.eq.${clientName},buyer_name.eq.${clientName}`).order("created_at", { ascending: false }),
    ]);
    if (resReservations.data) setClientReservations(resReservations.data as unknown as ReservationRow[]);
    if (resCards.data) setClientCards(resCards.data as unknown as ClientCard[]);
    if (resVouchers.data) setClientVouchers(resVouchers.data as unknown as GiftVoucher[]);
    setLoadingDetail(false);
  };

  const openAddCard = async () => {
    setShowAddCard(true);
    const { data } = await supabase.from("pricing_cards").select("id, name, sessions, validity").order("sort_order");
    if (data) setPricingCards(data as unknown as PricingCard[]);
  };

  const handleAddCard = async () => {
    if (!selectedClient || !selectedPricing) return;
    const pricing = pricingCards.find(p => p.id === selectedPricing);
    if (!pricing) return;
    setAddingCard(true);
    const now = new Date();
    const match = pricing.validity.match(/(\d+)/);
    const months = match ? parseInt(match[1]) : 1;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const { error } = await supabase.from("client_cards").insert({
      client_name: selectedClient, card_name: pricing.name,
      total_sessions: pricing.sessions, used_sessions: 0,
      expires_at: expiresAt.toISOString().split("T")[0],
    } as any);
    if (error) toast({ title: "Erreur", variant: "destructive" });
    else {
      toast({ title: "Carte ajoutée" });
      const { data } = await supabase.from("client_cards").select("*").eq("client_name", selectedClient).order("created_at", { ascending: false });
      if (data) setClientCards(data as unknown as ClientCard[]);
    }
    setAddingCard(false);
    setShowAddCard(false);
    setSelectedPricing("");
  };

  const deleteCard = async (cardId: string) => {
    await supabase.from("client_cards").delete().eq("id", cardId);
    setClientCards(prev => prev.filter(c => c.id !== cardId));
    toast({ title: "Carte supprimée" });
  };

  const openNewClient = () => {
    setEditingProfileId(null);
    setEditForm({ first_name: "", last_name: "", phone: "", email: "", address: "" });
    setEditClientOpen(true);
  };

  const openEditClient = (client: AggregatedClient) => {
    setEditingProfileId(client.profileId || null);
    setEditForm({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
    });
    setEditClientOpen(true);
  };

  const saveClient = async () => {
    if (!editForm.first_name.trim()) return;
    const displayName = makeDisplayName(editForm.first_name, editForm.last_name);
    if (editingProfileId) {
      await supabase.from("profiles").update({
        user_name: displayName,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      } as any).eq("id", editingProfileId);
    } else {
      await supabase.from("profiles").insert({
        user_name: displayName,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      } as any);
    }
    toast({ title: editingProfileId ? "Client modifié ✓" : "Client ajouté ✓" });
    setEditClientOpen(false);
    loadClients();
  };

  const confirmDeleteClient = async () => {
    if (!deletingClient) return;
    if (deletingClient.profileId) {
      await supabase.from("profiles").delete().eq("id", deletingClient.profileId);
    }
    toast({ title: "Client supprimé", variant: "destructive" });
    setDeletingClient(null);
    setSelectedClient(null);
    loadClients();
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.first_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.last_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Clients">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={openNewClient}>
          <UserPlus className="h-4 w-4" /> Ajouter un client
        </Button>
        <p className="text-sm text-muted-foreground self-center">{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Téléphone</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Réservations</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun client trouvé</td></tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.name}
                  className="border-b last:border-0 hover:bg-muted/10 cursor-pointer"
                  onClick={() => openClientDetail(c.name)}
                >
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    {c.first_name && c.last_name && (
                      <div className="text-xs text-muted-foreground">{c.first_name} {c.last_name}</div>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.phone || "—"}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.email || "—"}</td>
                  <td className="p-3">
                    {c.totalReservations === 0
                      ? <Badge variant="outline" className="text-xs">Futur client</Badge>
                      : c.totalReservations}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditClient(c); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingClient(c); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary-dark">{selectedClient}</DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-6">
              {/* Cards section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-primary-dark">Cartes & Crédits</h3>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={openAddCard}>
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </div>
                {clientCards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune carte</p>
                ) : (
                  <div className="space-y-2">
                    {clientCards.map((card) => {
                      const remaining = card.total_sessions - card.used_sessions;
                      const pct = (card.used_sessions / card.total_sessions) * 100;
                      return (
                        <div key={card.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{card.card_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Exp. {new Date(card.expires_at).toLocaleDateString("fr-FR")}</span>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteCard(card.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary-dark transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium">{card.used_sessions}/{card.total_sessions}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{remaining} crédit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Gift vouchers */}
              {clientVouchers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-primary-dark mb-3">Bons cadeaux</h3>
                  <div className="space-y-2">
                    {clientVouchers.map(v => (
                      <div key={v.id} className="rounded-lg border p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{v.card_name || (v.type === "amount" ? `${v.amount}€` : `${v.sessions} séances`)}</p>
                          <p className="text-xs text-muted-foreground">Code : {v.code} · Exp. {new Date(v.expires_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <Badge variant={v.used ? "secondary" : "default"} className="text-xs">{v.used ? "Utilisé" : "Actif"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reservations history */}
              <div>
                <h3 className="text-sm font-semibold text-primary-dark mb-3">Historique des réservations</h3>
                {clientReservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune réservation</p>
                ) : (
                  <div className="space-y-2">
                    {clientReservations.map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{r.activity_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(r.date).toLocaleDateString("fr-FR")} · {r.time}
                          </div>
                        </div>
                        <Badge variant="outline" className={
                          r.status === "confirmé" ? "bg-primary/15 text-primary-dark border-primary/30" :
                          r.status === "annulé" ? "bg-destructive/10 text-destructive border-destructive/30" :
                          "bg-accent/20 text-accent-foreground border-accent/30"
                        }>
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une carte à {selectedClient}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de carte</Label>
              <Select value={selectedPricing} onValueChange={setSelectedPricing}>
                <SelectTrigger><SelectValue placeholder="Choisir une carte" /></SelectTrigger>
                <SelectContent>
                  {pricingCards.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.sessions} séance{p.sessions > 1 ? "s" : ""} ({p.validity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddCard} disabled={!selectedPricing || addingCard} className="w-full">
              {addingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProfileId ? "Modifier le client" : "Nouveau client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prénom</Label><Input value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} /></div>
              <div><Label>Nom</Label><Input value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} /></div>
            </div>
            {editForm.first_name && (
              <p className="text-xs text-muted-foreground">Nom d'affichage : <span className="font-medium">{makeDisplayName(editForm.first_name, editForm.last_name)}</span></p>
            )}
            <div><Label>Téléphone</Label><Input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="06 12 34 56 78" /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="sophie@email.com" /></div>
            <div><Label>Adresse</Label><Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="12 rue de la Paix, 75002 Paris" /></div>
            <Button className="w-full" onClick={saveClient} disabled={!editForm.first_name.trim()}>
              {editingProfileId ? "Enregistrer" : "Ajouter le client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => !open && setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil de {deletingClient?.name} sera supprimé. Les réservations existantes seront conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
