import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Loader2, UserPlus, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { makeDisplayName } from "@/lib/client-name";
import ClientDetailDialog from "@/components/admin/ClientDetailDialog";

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

export default function AdminClients() {
  const { toast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<AggregatedClient[]>([]);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "", address: "" });
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientType, setNewClientType] = useState<"actuel" | "futur">("actuel");

  const loadClients = async () => {
    setLoading(true);
    const [resData, voucherData, profilesData, clientProfilesData, cardsData] = await Promise.all([
      supabase.from("reservations").select("client_name, date, activity_name"),
      supabase.from("gift_vouchers").select("beneficiary_name, buyer_name, created_at"),
      supabase.from("profiles").select("*"),
      supabase.from("client_profiles").select("*").eq("role", "client"),
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
    // Real client accounts (Supabase Auth), created via signup or guest checkout
    if (clientProfilesData.data) {
      for (const p of clientProfilesData.data as any[]) {
        const displayName = makeDisplayName(p.first_name, p.last_name) || p.email;
        if (!displayName || map.has(displayName)) continue;
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

  const handleResetAll = async () => {
    await Promise.all([
      supabase.from("reservations").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("client_cards").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("gift_vouchers").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
      supabase.from("forum_posts").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    ]);
    toast({ title: "Données clients réinitialisées ✓" });
    setResetDialogOpen(false);
    loadClients();
  };

  const filtered = useMemo(() => {
    let list = clients;
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
  }, [clients, search]);

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
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} client{filtered.length > 1 ? "s" : ""}</p>
      </div>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser toutes les données clients ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera les fiches clients historiques (sans compte), les réservations, cartes, bons cadeaux et messages du forum. Les comptes clients réels (avec connexion) ne sont pas supprimés ici. Cette action est irréversible.
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
                  onClick={() => setSelectedClient(c.name)}
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

      <div className="mt-8 pt-4 border-t flex justify-end">
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setResetDialogOpen(true)}>
          <RotateCcw className="h-4 w-4" /> Réinitialiser les données clients
        </Button>
      </div>

      <ClientDetailDialog
        clientName={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open) => !open && setSelectedClient(null)}
        onChanged={loadClients}
      />

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

    </AdminLayout>
  );
}
