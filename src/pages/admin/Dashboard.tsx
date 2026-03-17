import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Bell, Loader2, Zap, CreditCard, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDemoContext } from "@/contexts/DemoContext";
import { Badge } from "@/components/ui/badge";

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

type TimeFilter = "all" | "today" | "week";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState<ReservationRow[]>([]);
  const [yogaPurchases, setYogaPurchases] = useState<ClientCardRow[]>([]);
  const { demoNotifications } = useDemoContext();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");

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

  const activityNames = useMemo(() => {
    const names = new Set<string>();
    recentReservations.forEach(r => names.add(r.activity_name));
    return ["all", ...Array.from(names).sort()];
  }, [recentReservations]);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filterByTime = (dateStr: string) => {
    if (timeFilter === "all") return true;
    if (timeFilter === "today") return dateStr.startsWith(todayStr);
    if (timeFilter === "week") return new Date(dateStr) >= weekAgo;
    return true;
  };

  const filteredReservations = useMemo(() => {
    return recentReservations
      .filter(r => filterByTime(r.created_at))
      .filter(r => activityFilter === "all" || r.activity_name === activityFilter);
  }, [recentReservations, timeFilter, activityFilter]);

  const filteredPurchases = useMemo(() => {
    return yogaPurchases.filter(p => filterByTime(p.created_at));
  }, [yogaPurchases, timeFilter]);

  if (loading) {
    return (
      <AdminLayout title="Notifications">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Notifications">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-1.5">
            {([["all", "Générale"], ["today", "Aujourd'hui"], ["week", "Semaine"]] as [TimeFilter, string][]).map(([val, label]) => (
              <Badge
                key={val}
                variant={timeFilter === val ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setTimeFilter(val)}
              >
                {label}
              </Badge>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {activityNames.map(name => (
              <Badge
                key={name}
                variant={activityFilter === name ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => setActivityFilter(name)}
              >
                {name === "all" ? "Toutes" : name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Demo live notifications */}
        {demoNotifications.length > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="p-4 sm:p-5 border-b flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="font-display font-semibold text-primary-dark">Flux</h2>
              <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">LIVE</Badge>
            </div>
            <div className="divide-y">
              {demoNotifications.map((notif) => (
                <div key={notif.id} className="p-3 sm:p-4 flex items-start gap-3">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                    notif.type === "purchase" ? "bg-accent" :
                    notif.type === "reservation" ? "bg-primary" :
                    "bg-secondary"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(notif.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
