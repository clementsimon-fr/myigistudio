import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Clock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { makeDisplayName } from "@/lib/client-name";

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

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
}

interface ClientDetailDialogProps {
  clientName: string | null;
  // Téléphone saisi directement sur une réservation ajoutée manuellement (invité sans
  // compte) — affiché si aucun profil client n'est trouvé pour ce nom.
  fallbackPhone?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export default function ClientDetailDialog({ clientName, fallbackPhone, open, onOpenChange, onChanged }: ClientDetailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileSource, setProfileSource] = useState<"profiles" | "client_profiles" | null>(null);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [vouchers, setVouchers] = useState<GiftVoucher[]>([]);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "" });

  const [showAddCard, setShowAddCard] = useState(false);
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [selectedPricing, setSelectedPricing] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open || !clientName) return;
    setEditMode(false);
    setLoading(true);
    (async () => {
      const [profilesRes, clientProfilesRes, resReservations, resCards, resVouchers] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("client_profiles").select("*").eq("role", "client"),
        supabase.from("reservations").select("id, activity_name, date, time, status").eq("client_name", clientName).order("date", { ascending: false }),
        supabase.from("client_cards").select("*").eq("client_name", clientName).order("created_at", { ascending: false }),
        supabase.from("gift_vouchers").select("*").or(`beneficiary_name.eq.${clientName},buyer_name.eq.${clientName}`).order("created_at", { ascending: false }),
      ]);
      const matchedProfile = (profilesRes.data as any[] | null)?.find(
        (p) => (makeDisplayName(p.first_name, p.last_name) || p.user_name) === clientName
      ) || null;
      const matchedClientProfile = !matchedProfile ? (clientProfilesRes.data as any[] | null)?.find(
        (p) => (makeDisplayName(p.first_name, p.last_name) || p.email) === clientName
      ) || null : null;
      const matched = matchedProfile || matchedClientProfile;
      setProfileSource(matchedProfile ? "profiles" : matchedClientProfile ? "client_profiles" : null);
      setProfile(matched ? {
        id: matched.id,
        first_name: matched.first_name || "",
        last_name: matched.last_name || "",
        phone: matched.phone || "",
        email: matched.email || "",
        address: matched.address || "",
      } : null);
      setEditForm({
        first_name: matched?.first_name || "",
        last_name: matched?.last_name || "",
        phone: matched?.phone || "",
        email: matched?.email || "",
        address: matched?.address || "",
      });
      if (resReservations.data) setReservations(resReservations.data as unknown as ReservationRow[]);
      if (resCards.data) setCards(resCards.data as unknown as ClientCard[]);
      if (resVouchers.data) setVouchers(resVouchers.data as unknown as GiftVoucher[]);
      setLoading(false);
    })();
  }, [open, clientName]);

  // Bouton retour du téléphone / geste swipe-back : ferme le panneau au lieu de quitter la page.
  useBackNavigation(open, clientName || "", () => onOpenChange(false));

  const saveEdit = async () => {
    if (!profile) return;
    if (profileSource === "client_profiles") {
      await supabase.from("client_profiles").update({
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      }).eq("id", profile.id);
    } else {
      const displayName = makeDisplayName(editForm.first_name, editForm.last_name);
      await supabase.from("profiles").update({
        user_name: displayName,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
      } as any).eq("id", profile.id);
    }
    toast({ title: "Client modifié ✓" });
    setEditMode(false);
    onChanged?.();
  };

  const openAddCard = async () => {
    setShowAddCard(true);
    const { data } = await supabase.from("pricing_cards").select("id, name, sessions, validity").order("sort_order");
    if (data) setPricingCards(data as unknown as PricingCard[]);
  };

  const handleAddCard = async () => {
    if (!clientName || !selectedPricing) return;
    const pricing = pricingCards.find((p) => p.id === selectedPricing);
    if (!pricing) return;
    setAddingCard(true);
    const now = new Date();
    const match = pricing.validity.match(/(\d+)/);
    const months = match ? parseInt(match[1]) : 1;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);
    const { error } = await supabase.from("client_cards").insert({
      client_name: clientName, card_name: pricing.name,
      total_sessions: pricing.sessions, used_sessions: 0,
      expires_at: expiresAt.toISOString().split("T")[0],
    } as any);
    if (error) toast({ title: "Erreur", variant: "destructive" });
    else {
      toast({ title: "Carte ajoutée" });
      const { data } = await supabase.from("client_cards").select("*").eq("client_name", clientName).order("created_at", { ascending: false });
      if (data) setCards(data as unknown as ClientCard[]);
      onChanged?.();
    }
    setAddingCard(false);
    setShowAddCard(false);
    setSelectedPricing("");
  };

  const deleteCard = async (cardId: string) => {
    await supabase.from("client_cards").delete().eq("id", cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    toast({ title: "Carte supprimée" });
    onChanged?.();
  };

  const confirmDelete = async () => {
    if (!profile || profileSource !== "profiles") return;
    await supabase.from("profiles").delete().eq("id", profile.id);
    toast({ title: "Client supprimé", variant: "destructive" });
    setDeleteConfirmOpen(false);
    onOpenChange(false);
    onChanged?.();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-primary-dark">{clientName}</SheetTitle>
          </SheetHeader>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="infos">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="infos">Infos</TabsTrigger>
                  <TabsTrigger value="cartes">Cartes &amp; bons</TabsTrigger>
                  <TabsTrigger value="historique">Historique</TabsTrigger>
                </TabsList>

                <TabsContent value="infos" className="space-y-3">
                  {profile ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-primary-dark">Informations</h3>
                        {!editMode ? (
                          <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditMode(true)}>Modifier</Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" className="text-xs" onClick={saveEdit}>Enregistrer</Button>
                            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditMode(false)}>Annuler</Button>
                          </div>
                        )}
                      </div>
                      {editMode ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-xs">Prénom</Label><Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="h-8 text-sm" /></div>
                            <div><Label className="text-xs">Nom</Label><Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="h-8 text-sm" /></div>
                          </div>
                          <div><Label className="text-xs">Téléphone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">Email</Label><Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="h-8 text-sm" /></div>
                          <div><Label className="text-xs">Adresse</Label><Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="h-8 text-sm" /></div>
                        </div>
                      ) : (
                        <div className="text-sm space-y-1">
                          {profile.phone && <p className="text-muted-foreground">📞 {profile.phone}</p>}
                          {profile.email && <p className="text-muted-foreground">✉️ {profile.email}</p>}
                          {profile.address && <p className="text-muted-foreground">📍 {profile.address}</p>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ce client n'a pas de compte.</p>
                      {fallbackPhone ? (
                        <p className="text-sm text-muted-foreground">📞 {fallbackPhone}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune information de contact enregistrée.</p>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cartes" className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-primary-dark">Cartes Yoga</h3>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={openAddCard}>
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </Button>
                    </div>
                    {cards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune carte</p>
                    ) : (
                      <div className="space-y-2">
                        {cards.map((card) => {
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

                  <div>
                    <h3 className="text-sm font-semibold text-primary-dark mb-3">Bons cadeaux</h3>
                    {vouchers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun bon cadeau</p>
                    ) : (
                      <div className="space-y-2">
                        {vouchers.map((v) => (
                          <div key={v.id} className="rounded-lg border p-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{v.card_name || (v.type === "amount" ? `${v.amount}€` : `${v.sessions} séances`)}</p>
                              <p className="text-xs text-muted-foreground">Code : {v.code} · Exp. {new Date(v.expires_at).toLocaleDateString("fr-FR")}</p>
                            </div>
                            <Badge variant={v.used ? "secondary" : "default"} className="text-xs">{v.used ? "Utilisé" : "Actif"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="historique">
                  {reservations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune réservation</p>
                  ) : (
                    <div className="space-y-2">
                      {reservations.map((r) => (
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
                </TabsContent>
              </Tabs>

              {profile && profileSource === "profiles" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer ce client
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter une carte à {clientName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de carte</Label>
              <Select value={selectedPricing} onValueChange={setSelectedPricing}>
                <SelectTrigger><SelectValue placeholder="Choisir une carte" /></SelectTrigger>
                <SelectContent>
                  {pricingCards.map((p) => (
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

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le profil de {clientName} sera supprimé. Les réservations existantes seront conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
