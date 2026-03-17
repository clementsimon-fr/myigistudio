import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Loader2, Clock, Plus, Trash2, UserPlus, RotateCcw, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoContext } from "@/contexts/DemoContext";

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
  prestations: string[];
  yogaCredits: number;
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

type AccountFilter = "all" | "with" | "without";

export default function AdminClients() {
  const { toast } = useToast();
  const { clearTempProfiles } = useDemoContext();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AggregatedClient[]>([]);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientReservations, setClientReservations] = useState<ReservationRow[]>([]);
  const [clientCards, setClientCards] = useState<ClientCard[]>([]);
  const [clientVouchers, setClientVouchers] = useState<GiftVoucher[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [showAddCard, setShowAddCard] = useState(false);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [selectedPricing, setSelectedPricing] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "" });
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientType, setNewClientType] = useState<"actuel" | "futur">("actuel");

  const [deletingClient, setDeletingClient] = useState<AggregatedClient | null>(null);

  // Detail dialog inline editing
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [detailEditForm, setDetailEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "" });
  const [selectedClientObj, setSelectedClientObj] = useState<AggregatedClient | null>(null);

  const loadClients = async () => {
    setLoading(true);
    const [resData, voucherData, profilesData, cardsData] = await Promise.all([
      supabase.from("reservations").select("client_name, date, activity_name"),
      supabase.from("gift_vouchers").select("beneficiary_name, buyer_name, created_at"),
      supabase.from("profiles").select("*"),
      supabase.from("client_cards").select("client_name, card_name, total_sessions, used_sessions"),
    ]);
    const map = new Map<string, { count: number; first: string; profileId?: string; first_name?: string; last_name?: string; phone?: string; email?: string; address?: string; prestas: Set<string>; yogaCredits: number }>();

    // Build yoga credits map
    const creditsMap = new Map<string, number>();
    if (cardsData.data) {
      for (const c of cardsData.data as any[]) {
        const remaining = (c.total_sessions || 0) - (c.used_sessions || 0);
        creditsMap.set(c.client_name, (creditsMap.get(c.client_name) || 0) + Math.max(0, remaining));
      }
    }

    if (profilesData.data) {
      for (const p of profilesData.data as any[]) {
        const displayName = makeDisplayName(p.first_name, p.last_name) || p.user_name;
        map.set(displayName, {
          count: 0, first: p.created_at?.split("T")[0] || "",
          profileId: p.id, first_name: p.first_name || "", last_name: p.last_name || "",
          phone: p.phone || "", email: p.email || "", address: p.address || "",
          prestas: new Set<string>(), yogaCredits: creditsMap.get(displayName) || 0,
        });
      }
    }

    if (resData.data) {
      (resData.data as any[]).forEach((r) => {
        const existing = map.get(r.client_name);
        if (existing) {
          existing.count++;
          if (!existing.first) existing.first = r.date;
          if (r.activity_name) existing.prestas.add(r.activity_name);
        } else {
          const prestas = new Set<string>();
          if (r.activity_name) prestas.add(r.activity_name);
          map.set(r.client_name, { count: 1, first: r.date, prestas, yogaCredits: creditsMap.get(r.client_name) || 0 });
        }
      });
    }
    if (voucherData.data) {
      (voucherData.data as any[]).forEach((v) => {
        [v.beneficiary_name, v.buyer_name].filter(Boolean).forEach((name: string) => {
          const existing = map.get(name);
          if (existing) {
            existing.prestas.add("Bon cadeau");
          } else {
            const prestas = new Set<string>(["Bon cadeau"]);
            map.set(name, { count: 0, first: v.created_at?.split("T")[0] || "", prestas, yogaCredits: creditsMap.get(name) || 0 });
          }
        });
      });
    }
    if (cardsData.data) {
      (cardsData.data as any[]).forEach((c) => {
        const existing = map.get(c.client_name);
        if (existing) existing.prestas.add(c.card_name);
      });
    }
    const list: AggregatedClient[] = Array.from(map.entries()).map(([name, v]) => ({
      name, totalReservations: v.count, firstReservation: v.first,
      profileId: v.profileId, first_name: v.first_name, last_name: v.last_name,
      phone: v.phone, email: v.email, address: v.address,
      prestations: Array.from(v.prestas), yogaCredits: v.yogaCredits,
    }));
    setClients(list);
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, []);

  const allActivities = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => c.prestations.forEach(p => set.add(p)));
    return ["all", ...Array.from(set).sort()];
  }, [clients]);

  const openClientDetail = async (client: AggregatedClient) => {
    setSelectedClient(client.name);
    setSelectedClientObj(client);
    setDetailEditMode(false);
    setDetailEditForm({
      first_name: client.first_name || "",
      last_name: client.last_name || "",
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
    });
    setEditingProfileId(client.profileId || null);
    setLoadingDetail(true);
    const [resReservations, resCards, resVouchers] = await Promise.all([
      supabase.from("reservations").select("id, activity_name, date, time, status").eq("client_name", client.name).order("date", { ascending: false }),
      supabase.from("client_cards").select("*").eq("client_name", client.name).order("created_at", { ascending: false }),
      supabase.from("gift_vouchers").select("*").or(`beneficiary_name.eq.${client.name},buyer_name.eq.${client.name}`).order("created_at", { ascending: false }),
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
    setNewClientType("actuel");
    setEditForm({ first_name: "", last_name: "", phone: "", email: "", address: "" });
    setNewClientOpen(true);
  };

  const saveNewClient = async () => {
    if (!editForm.first_name.trim()) return;
    const displayName = makeDisplayName(editForm.first_name, editForm.last_name);
    await supabase.from("profiles").insert({
      user_name: displayName,
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone,
      email: editForm.email,
      address: editForm.address,
    } as any);
    toast({ title: "Client ajouté ✓" });
    setNewClientOpen(false);
    loadClients();
  };

  const saveDetailEdit = async () => {
    if (!editingProfileId) return;
    const displayName = makeDisplayName(detailEditForm.first_name, detailEditForm.last_name);
    await supabase.from("profiles").update({
      user_name: displayName,
      first_name: detailEditForm.first_name,
      last_name: detailEditForm.last_name,
      phone: detailEditForm.phone,
      email: detailEditForm.email,
      address: detailEditForm.address,
    } as any).eq("id", editingProfileId);
    toast({ title: "Client modifié ✓" });
    setDetailEditMode(false);
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

  const handleResetAll = async () => {
    await Promise.all([
      supabase.from("reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("client_cards").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("gift_vouchers").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("forum_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ]);
    clearTempProfiles();
    // Also clear current profile and localStorage to remove persistent demo profiles
    localStorage.removeItem("demo_profile");
    localStorage.removeItem("demo_guest_name");
    toast({ title: "Données clients réinitialisées ✓" });
    setResetDialogOpen(false);
    loadClients();
  };

  const filtered = useMemo(() => {
    let list = clients;
    if (accountFilter === "with") list = list.filter(c => !!c.profileId);
    if (accountFilter === "without") list = list.filter(c => !c.profileId);
    if (activityFilter !== "all") list = list.filter(c => c.prestations.includes(activityFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.first_name || "").toLowerCase().includes(q) ||
        (c.last_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [clients, search, accountFilter, activityFilter]);

  const withAccount = clients.filter(c => !!c.profileId).length;
  const withoutAccount = clients.filter(c => !c.profileId).length;

  return (
    <AdminLayout title="Clients">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 overflow-x-hidden">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary-dark">{clients.length}</p>
          <p className="text-[11px] text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary-dark">{withAccount}</p>
          <p className="text-[11px] text-muted-foreground">Avec compte</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary-dark">{withoutAccount}</p>
          <p className="text-[11px] text-muted-foreground">Sans compte</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNewClient}>
            <UserPlus className="h-4 w-4" /> Ajouter
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setResetDialogOpen(true)}>
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          {([["all", "Tous"], ["with", "Avec compte"], ["without", "Sans compte"]] as [AccountFilter, string][]).map(([val, label]) => (
            <Badge key={val} variant={accountFilter === val ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setAccountFilter(val)}>
              {label}
            </Badge>
          ))}
          <div className="w-px bg-border mx-1" />
          {allActivities.map(a => (
            <Badge key={a} variant={activityFilter === a ? "default" : "outline"} className="cursor-pointer text-[10px]" onClick={() => setActivityFilter(a)}>
              {a === "all" ? "Toutes activités" : a}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
      </div>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser toutes les données clients ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera tous les comptes clients, leurs réservations, cartes, bons cadeaux et messages du forum. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Tout supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Profil</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Prestations</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Yoga</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Résa</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Aucun client trouvé</td></tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.name}
                  className="border-b last:border-0 hover:bg-muted/10 cursor-pointer"
                  onClick={() => openClientDetail(c)}
                >
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    {c.first_name && c.last_name && (
                      <div className="text-xs text-muted-foreground">{c.first_name} {c.last_name}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-[10px] ${c.profileId ? "bg-primary/10 text-primary-dark border-primary/20" : "bg-muted text-muted-foreground"}`}>
                      {c.profileId ? "Compte" : "Sans compte"}
                    </Badge>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{c.email || "—"}</td>
                  <td className="p-3 hidden lg:table-cell">
                    {c.prestations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.prestations.slice(0, 3).map((p, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5">{p}</Badge>
                        ))}
                        {c.prestations.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5">+{c.prestations.length - 3}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {c.yogaCredits > 0 ? (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary-dark border-primary/20">
                        {c.yogaCredits} cours
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {c.totalReservations === 0
                      ? <Badge variant="outline" className="text-xs">Futur client</Badge>
                      : c.totalReservations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Client Detail Dialog - inline editable */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => { if (!open) { setSelectedClient(null); setSelectedClientObj(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary-dark">{selectedClient}</DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-6">
              {/* Editable profile fields */}
              {selectedClientObj?.profileId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-primary-dark">Informations</h3>
                    {!detailEditMode ? (
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setDetailEditMode(true)}>Modifier</Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" className="text-xs" onClick={saveDetailEdit}>Enregistrer</Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setDetailEditMode(false)}>Annuler</Button>
                      </div>
                    )}
                  </div>
                  {detailEditMode ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">Prénom</Label><Input value={detailEditForm.first_name} onChange={e => setDetailEditForm({ ...detailEditForm, first_name: e.target.value })} className="h-8 text-sm" /></div>
                        <div><Label className="text-xs">Nom</Label><Input value={detailEditForm.last_name} onChange={e => setDetailEditForm({ ...detailEditForm, last_name: e.target.value })} className="h-8 text-sm" /></div>
                      </div>
                      <div><Label className="text-xs">Téléphone</Label><Input value={detailEditForm.phone} onChange={e => setDetailEditForm({ ...detailEditForm, phone: e.target.value })} className="h-8 text-sm" /></div>
                      <div><Label className="text-xs">Email</Label><Input value={detailEditForm.email} onChange={e => setDetailEditForm({ ...detailEditForm, email: e.target.value })} className="h-8 text-sm" /></div>
                      <div><Label className="text-xs">Adresse</Label><Input value={detailEditForm.address} onChange={e => setDetailEditForm({ ...detailEditForm, address: e.target.value })} className="h-8 text-sm" /></div>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      {selectedClientObj?.phone && <p className="text-muted-foreground">📞 {selectedClientObj.phone}</p>}
                      {selectedClientObj?.email && <p className="text-muted-foreground">✉️ {selectedClientObj.email}</p>}
                      {selectedClientObj?.address && <p className="text-muted-foreground">📍 {selectedClientObj.address}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Cards section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-primary-dark">Cartes Yoga</h3>
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

              {/* Delete button inside detail */}
              {selectedClientObj && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeletingClient(selectedClientObj)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer ce client
                </Button>
              )}
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

      {/* New Client Dialog */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Type de client</Label>
              <div className="flex gap-2">
                <Button variant={newClientType === "actuel" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setNewClientType("actuel")}>
                  Client actuel
                </Button>
                <Button variant={newClientType === "futur" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setNewClientType("futur")}>
                  Futur client
                </Button>
              </div>
            </div>
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
            <Button className="w-full" onClick={saveNewClient} disabled={!editForm.first_name.trim()}>
              Ajouter le client
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
