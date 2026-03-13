import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { CalendarDays, Users, TrendingUp, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReservationRow {
  id: string;
  client_name: string;
  activity_name: string;
  date: string;
  time: string;
  status: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [recentReservations, setRecentReservations] = useState<ReservationRow[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [fillRate, setFillRate] = useState(0);
  const [weekCourses, setWeekCourses] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const [resRecent, resToday, resClients, resCourses, resSchedules] = await Promise.all([
        supabase.from("reservations").select("id, client_name, activity_name, date, time, status").order("created_at", { ascending: false }).limit(10),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("date", today).eq("status", "confirmé"),
        supabase.from("reservations").select("client_name"),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("course_schedules").select("spots, spots_left"),
      ]);

      if (resRecent.data) setRecentReservations(resRecent.data as unknown as ReservationRow[]);
      setTodayCount(resToday.count || 0);

      // Unique clients
      if (resClients.data) {
        const unique = new Set((resClients.data as any[]).map(r => r.client_name));
        setClientCount(unique.size);
      }

      // Fill rate from schedules
      if (resSchedules.data && resSchedules.data.length > 0) {
        const schedules = resSchedules.data as any[];
        const totalSpots = schedules.reduce((s: number, r: any) => s + r.spots, 0);
        const usedSpots = schedules.reduce((s: number, r: any) => s + (r.spots - r.spots_left), 0);
        setFillRate(totalSpots > 0 ? Math.round((usedSpots / totalSpots) * 100) : 0);
      }

      // Courses + workshops count
      const workshopCount = await supabase.from("workshops").select("id", { count: "exact", head: true });
      setWeekCourses((resCourses.count || 0) + (workshopCount.count || 0));

      setLoading(false);
    };
    load();
  }, []);

  const stats = [
    { label: "Réservations du jour", value: todayCount, icon: CalendarDays, color: "text-primary-dark" },
    { label: "Clients inscrits", value: clientCount, icon: Users, color: "text-primary" },
    { label: "Taux de remplissage", value: `${fillRate}%`, icon: TrendingUp, color: "text-accent" },
    { label: "Activités", value: weekCourses, icon: Clock, color: "text-primary-dark" },
  ];

  if (loading) {
    return (
      <AdminLayout title="Tableau de bord">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Tableau de bord">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-5 border-b">
          <h2 className="font-display font-semibold text-primary-dark">Dernières réservations</h2>
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
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune réservation</td></tr>
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
