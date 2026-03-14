import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, Clock, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AggregatedClient {
  name: string;
  totalReservations: number;
  firstReservation: string;
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

export default function AdminClients() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AggregatedClient[]>([]);

  // Client detail dialog
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientReservations, setClientReservations] = useState<ReservationRow[]>([]);
  const [clientCards, setClientCards] = useState<ClientCard[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add card dialog
  const [showAddCard, setShowAddCard] = useState(false);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [selectedPricing, setSelectedPricing] = useState("");
  const [addingCard, setAddingCard] = useState(false);

  const loadClients = async () => {
    setLoading(true);
    const [resData, voucherData] = await Promise.all([
      supabase.from("reservations").select("client_name, date").order("date", { ascending: true }),
      supabase.from("gift_vouchers").select("beneficiary_name, buyer_name, created_at"),
    ]);
    const map = new Map<string, { count: number; first: string; source: string }>();
    if (resData.data) {
      (resData.data as any[]).forEach((r) => {
        const existing = map.get(r.client_name);
        if (existing) {
          existing.count++;
        } else {
          map.set(r.client_name, { count: 1, first: r.date, source: "client" });
        }
      });
    }
    // Add gift voucher beneficiaries/buyers as "future clients" if not already in map
    if (voucherData.data) {
      (voucherData.data as any[]).forEach((v) => {
        [v.beneficiary_name, v.buyer_name].filter(Boolean).forEach((name: string) => {
          if (name && !map.has(name)) {
            map.set(name, { count: 0, first: v.created_at?.split("T")[0] || "", source: "voucher" });
          }
        });
      });
    }
    const list: AggregatedClient[] = Array.from(map.entries()).map(([name, v]) => ({
      name,
      totalReservations: v.count,
      firstReservation: v.first,
    }));
    setClients(list);
    setLoading(false);
  };

  useEffect(() => { loadClients(); }, []);

  const openClientDetail = async (clientName: string) => {
    setSelectedClient(clientName);
    setLoadingDetail(true);
    const [resReservations, resCards] = await Promise.all([
      supabase.from("reservations").select("id, activity_name, date, time, status").eq("client_name", clientName).order("date", { ascending: false }),
      supabase.from("client_cards").select("*").eq("client_name", clientName).order("created_at", { ascending: false }),
    ]);
    if (resReservations.data) setClientReservations(resReservations.data as unknown as ReservationRow[]);
    if (resCards.data) setClientCards(resCards.data as unknown as ClientCard[]);
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
    // Calculate expiry from validity string
    const now = new Date();
    const match = pricing.validity.match(/(\d+)/);
    const months = match ? parseInt(match[1]) : 1;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const { error } = await supabase.from("client_cards").insert({
      client_name: selectedClient,
      card_name: pricing.name,
      total_sessions: pricing.sessions,
      used_sessions: 0,
      expires_at: expiresAt.toISOString().split("T")[0],
    } as any);

    if (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } else {
      toast({ title: "Carte ajoutée" });
      // Refresh cards
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

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Clients">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <p className="text-sm text-muted-foreground self-center">{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Nom</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Réservations</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Inscrit depuis</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Aucun client trouvé</td></tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.name}
                  className="border-b last:border-0 hover:bg-muted/10 cursor-pointer"
                  onClick={() => openClientDetail(c.name)}
                >
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">
                    {c.totalReservations === 0
                      ? <Badge variant="outline" className="text-xs">Futur client</Badge>
                      : c.totalReservations}
                  </td>
                  <td className="p-3">{c.firstReservation ? new Date(c.firstReservation).toLocaleDateString("fr-FR") : "—"}</td>
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
    </AdminLayout>
  );
}
