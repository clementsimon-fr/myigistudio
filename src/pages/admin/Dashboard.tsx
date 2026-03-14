import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Bell, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReservationRow {
  id: string;
  client_name: string;
  activity_name: string;
  date: string;
  time: string;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState<ReservationRow[]>([]);

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
    </AdminLayout>
  );
}
