import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Bell, Loader2, Clock, CreditCard, Euro, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ReservationRow {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  course_id: string | null;
  workshop_id: string | null;
  date: string;
  time: string;
  participants: number;
  status: string;
  created_at: string;
}

function formatDateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [categoryByName, setCategoryByName] = useState<Record<string, string>>({});
  const [priceByName, setPriceByName] = useState<Record<string, number>>({});
  const [yogaCreditsByClient, setYogaCreditsByClient] = useState<Record<string, number>>({});

  const [filters, setFilters] = useState({ client: "", activity: "", date: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resData, coursesData, workshopsData, cardsData] = await Promise.all([
        supabase.from("reservations")
          .select("id, client_name, activity_name, activity_type, course_id, workshop_id, date, time, participants, status, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("courses").select("name, category, price"),
        supabase.from("workshops").select("name, category, price"),
        supabase.from("client_cards").select("client_name, total_sessions, used_sessions"),
      ]);
      if (resData.data) setReservations(resData.data as unknown as ReservationRow[]);

      const catMap: Record<string, string> = {};
      const priceMap: Record<string, number> = {};
      if (coursesData.data) {
        for (const c of coursesData.data as any[]) {
          catMap[c.name.toLowerCase()] = c.category;
          if (c.price) priceMap[c.name.toLowerCase()] = c.price;
        }
      }
      if (workshopsData.data) {
        for (const w of workshopsData.data as any[]) {
          catMap[w.name.toLowerCase()] = w.category;
          if (w.price) priceMap[w.name.toLowerCase()] = w.price;
        }
      }
      setCategoryByName(catMap);
      setPriceByName(priceMap);

      const creditsMap: Record<string, number> = {};
      if (cardsData.data) {
        for (const c of cardsData.data as any[]) {
          const remaining = Math.max(0, (c.total_sessions || 0) - (c.used_sessions || 0));
          creditsMap[c.client_name] = (creditsMap[c.client_name] || 0) + remaining;
        }
      }
      setYogaCreditsByClient(creditsMap);

      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return reservations.filter(r =>
      (!filters.client || r.client_name.toLowerCase().includes(filters.client.toLowerCase())) &&
      (!filters.activity || r.activity_name.toLowerCase().includes(filters.activity.toLowerCase())) &&
      (!filters.date || formatDateFR(r.date).includes(filters.date))
    );
  }, [reservations, filters]);

  if (loading) {
    return (
      <AdminLayout title="Notifications">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Notifications">
      <div className="space-y-4 overflow-x-hidden">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold text-primary-dark">Inscriptions</h2>
          <Badge variant="outline" className="text-[10px] ml-auto">{filtered.length}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input placeholder="Filtrer par client…" value={filters.client} onChange={e => setFilters(f => ({ ...f, client: e.target.value }))} className="h-9 text-sm max-w-[200px]" />
          <Input placeholder="Filtrer par activité…" value={filters.activity} onChange={e => setFilters(f => ({ ...f, activity: e.target.value }))} className="h-9 text-sm max-w-[200px]" />
          <Input placeholder="Filtrer par date…" value={filters.date} onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} className="h-9 text-sm max-w-[160px]" />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">Aucune inscription</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map(r => {
              const category = categoryByName[r.activity_name.trim().toLowerCase()];
              const isYoga = category === "yoga";
              const isPoterie = category === "poterie";
              const unitPrice = priceByName[r.activity_name.trim().toLowerCase()] || 0;
              const montant = unitPrice * r.participants;
              const creditsLeft = yogaCreditsByClient[r.client_name];

              return (
                <div key={r.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{r.client_name}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      r.status === "confirmé" ? "bg-primary/15 text-primary-dark" :
                      r.status === "annulé" ? "bg-destructive/10 text-destructive" :
                      "bg-accent/20 text-accent-foreground"
                    }`}>
                      {r.status}
                    </span>
                  </div>
                  {r.participants > 1 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {r.participants} personnes
                    </div>
                  )}
                  <p className="text-sm">{r.activity_name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {formatDateFR(r.date)} · {r.time}
                  </div>
                  {isYoga && creditsLeft !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-primary-dark">{creditsLeft} carte{creditsLeft > 1 ? "s" : ""} Yoga restante{creditsLeft > 1 ? "s" : ""}</span>
                    </div>
                  )}
                  {isPoterie && unitPrice > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Euro className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-primary-dark">{montant} € (estimé)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
