import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Bell, Loader2, CreditCard, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ReservationRow {
  id: string;
  client_name: string;
  activity_name: string;
  date: string;
  time: string;
  status: string;
  created_at: string;
}

interface ClientCardRow {
  id: string;
  client_name: string;
  card_name: string;
  total_sessions: number;
  created_at: string;
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function ColumnFilterInput({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Filtrer…"
        className="h-7 pl-5 text-xs font-normal"
      />
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState<ReservationRow[]>([]);
  const [yogaPurchases, setYogaPurchases] = useState<ClientCardRow[]>([]);

  const [resFilters, setResFilters] = useState({ client: "", service: "", date: "", heure: "", statut: "" });
  const [cardFilters, setCardFilters] = useState({ client: "", carte: "", cours: "", date: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resData, cardsData] = await Promise.all([
        supabase.from("reservations")
          .select("id, client_name, activity_name, date, time, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("client_cards")
          .select("id, client_name, card_name, total_sessions, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (resData.data) setRecentReservations(resData.data as unknown as ReservationRow[]);
      if (cardsData.data) setYogaPurchases(cardsData.data as unknown as ClientCardRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filteredReservations = useMemo(() => {
    return recentReservations.filter(r =>
      (!resFilters.client || r.client_name.toLowerCase().includes(resFilters.client.toLowerCase())) &&
      (!resFilters.service || r.activity_name.toLowerCase().includes(resFilters.service.toLowerCase())) &&
      (!resFilters.date || formatDateFR(r.date).includes(resFilters.date)) &&
      (!resFilters.heure || r.time.includes(resFilters.heure)) &&
      (!resFilters.statut || r.status.toLowerCase().includes(resFilters.statut.toLowerCase()))
    );
  }, [recentReservations, resFilters]);

  const filteredPurchases = useMemo(() => {
    return yogaPurchases.filter(p =>
      (!cardFilters.client || p.client_name.toLowerCase().includes(cardFilters.client.toLowerCase())) &&
      (!cardFilters.carte || p.card_name.toLowerCase().includes(cardFilters.carte.toLowerCase())) &&
      (!cardFilters.cours || String(p.total_sessions).includes(cardFilters.cours)) &&
      (!cardFilters.date || formatDateFR(p.created_at).includes(cardFilters.date))
    );
  }, [yogaPurchases, cardFilters]);

  if (loading) {
    return (
      <AdminLayout title="Notifications">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Notifications">
      <div className="space-y-6 overflow-x-hidden">
        {/* Inscriptions */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 sm:p-5 border-b flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-primary-dark">Inscriptions</h2>
            <Badge variant="outline" className="text-[10px] ml-auto">{filteredReservations.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Heure</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                </tr>
                <tr className="border-b bg-muted/10">
                  <th className="p-2"><ColumnFilterInput value={resFilters.client} onChange={v => setResFilters(f => ({ ...f, client: v }))} /></th>
                  <th className="p-2"><ColumnFilterInput value={resFilters.service} onChange={v => setResFilters(f => ({ ...f, service: v }))} /></th>
                  <th className="p-2 hidden sm:table-cell"><ColumnFilterInput value={resFilters.date} onChange={v => setResFilters(f => ({ ...f, date: v }))} /></th>
                  <th className="p-2 hidden sm:table-cell"><ColumnFilterInput value={resFilters.heure} onChange={v => setResFilters(f => ({ ...f, heure: v }))} /></th>
                  <th className="p-2"><ColumnFilterInput value={resFilters.statut} onChange={v => setResFilters(f => ({ ...f, statut: v }))} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune inscription</td></tr>
                ) : filteredReservations.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-medium">{r.client_name}</td>
                    <td className="p-3">{r.activity_name}</td>
                    <td className="p-3 hidden sm:table-cell">{formatDateFR(r.date)}</td>
                    <td className="p-3 hidden sm:table-cell">{r.time}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === "confirmé" ? "bg-primary/15 text-primary-dark" :
                        r.status === "annulé" ? "bg-destructive/10 text-destructive" :
                        "bg-accent/20 text-accent-foreground"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Achats Yoga */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 sm:p-5 border-b flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-primary-dark">Achats Yoga</h2>
            <Badge variant="outline" className="text-[10px] ml-auto">{filteredPurchases.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[300px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Carte</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Cours</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Date</th>
                </tr>
                <tr className="border-b bg-muted/10">
                  <th className="p-2"><ColumnFilterInput value={cardFilters.client} onChange={v => setCardFilters(f => ({ ...f, client: v }))} /></th>
                  <th className="p-2"><ColumnFilterInput value={cardFilters.carte} onChange={v => setCardFilters(f => ({ ...f, carte: v }))} /></th>
                  <th className="p-2 hidden sm:table-cell"><ColumnFilterInput value={cardFilters.cours} onChange={v => setCardFilters(f => ({ ...f, cours: v }))} /></th>
                  <th className="p-2 hidden sm:table-cell"><ColumnFilterInput value={cardFilters.date} onChange={v => setCardFilters(f => ({ ...f, date: v }))} /></th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun achat</td></tr>
                ) : filteredPurchases.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-medium">{p.client_name}</td>
                    <td className="p-3">{p.card_name}</td>
                    <td className="p-3 hidden sm:table-cell">{p.total_sessions} cours</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{formatDateFR(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
