import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Bell, Loader2, Zap } from "lucide-react";
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState<ReservationRow[]>([]);
  const { demoNotifications } = useDemoContext();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reservations")
        .select("id, client_name, activity_name, date, time, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setRecentReservations(data as unknown as ReservationRow[]);
      setLoading(false);
    };
    load();
  }, []);

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
        {/* Demo live notifications */}
        {demoNotifications.length > 0 && (
          <div className="rounded-xl border bg-card">
            <div className="p-5 border-b flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <h2 className="font-display font-semibold text-primary-dark">Notifications en direct</h2>
              <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">LIVE</Badge>
            </div>
            <div className="divide-y">
              {demoNotifications.map((notif) => (
                <div key={notif.id} className="p-4 flex items-start gap-3">
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

        {/* Existing reservations table */}
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="font-display font-semibold text-primary-dark">Activité récente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Service</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Heure</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune notification</td></tr>
                ) : recentReservations.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-3 font-medium">{r.client_name}</td>
                    <td className="p-3">{r.activity_name}</td>
                    <td className="p-3">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3">{r.time}</td>
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
      </div>
    </AdminLayout>
  );
}
