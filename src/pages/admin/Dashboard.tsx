import AdminLayout from "@/components/admin/AdminLayout";
import { CalendarDays, Users, TrendingUp, Clock } from "lucide-react";
import { adminReservations, mockClients, yogaSchedule } from "@/data/mockData";

const todayReservations = adminReservations.filter((r) => r.status === "confirmé");
const totalSpots = yogaSchedule.reduce((sum, c) => sum + c.spots, 0);
const usedSpots = yogaSchedule.reduce((sum, c) => sum + (c.spots - c.spotsLeft), 0);
const fillRate = Math.round((usedSpots / totalSpots) * 100);

const stats = [
  { label: "Réservations du jour", value: todayReservations.length, icon: CalendarDays, color: "text-primary-dark" },
  { label: "Clients inscrits", value: mockClients.length, icon: Users, color: "text-primary" },
  { label: "Taux de remplissage", value: `${fillRate}%`, icon: TrendingUp, color: "text-accent" },
  { label: "Cours cette semaine", value: yogaSchedule.length, icon: Clock, color: "text-primary-dark" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout title="Tableau de bord">
      {/* Stats */}
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

      {/* Recent reservations */}
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
              {adminReservations.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                  <td className="p-3 font-medium">{r.client}</td>
                  <td className="p-3">{r.service}</td>
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
