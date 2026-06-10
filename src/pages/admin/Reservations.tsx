import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Loader2, XCircle, RotateCcw, List, CalendarDays, TrendingUp, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyView from "@/components/admin/DailyView";

interface Reservation {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  course_id: string | null;
  workshop_id: string | null;
  schedule_id: string | null;
  date: string;
  time: string;
  end_time: string;
  participants: number;
  status: string;
  notes: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  "confirmé": "bg-primary/15 text-primary-dark",
  "annulé": "bg-destructive/10 text-destructive",
  "liste d'attente": "bg-accent/20 text-accent-foreground",
};

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes", dot: "", activeBg: "" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
];

export default function AdminReservations() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "planning">("planning");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [fillRate, setFillRate] = useState(0);
  const [activitiesCount, setActivitiesCount] = useState(0);

  // Map activity names to categories
  const [activityCategories, setActivityCategories] = useState<Record<string, string>>({});

  const fetchReservations = async () => {
    setLoading(true);
    const [resData, resSchedules, resCourses, resWorkshops] = await Promise.all([
      supabase.from("reservations").select("*").order("date", { ascending: false }),
      supabase.from("course_schedules").select("spots, spots_left"),
      supabase.from("courses").select("id, name, category"),
      supabase.from("workshops").select("id, name, category, spots, spots_left"),
    ]);
    if (resData.data) setReservations(resData.data as unknown as Reservation[]);
    if (resSchedules.data && resSchedules.data.length > 0) {
      const scheds = resSchedules.data as any[];
      const total = scheds.reduce((s: number, r: any) => s + r.spots, 0);
      const used = scheds.reduce((s: number, r: any) => s + (r.spots - r.spots_left), 0);
      setFillRate(total > 0 ? Math.round((used / total) * 100) : 0);
    }
    // Build category map
    const catMap: Record<string, string> = {};
    if (resCourses.data) {
      for (const c of resCourses.data as any[]) catMap[c.name.toLowerCase()] = c.category;
    }
    if (resWorkshops.data) {
      for (const w of resWorkshops.data as any[]) catMap[w.name.toLowerCase()] = w.category;
    }
    setActivityCategories(catMap);
    setActivitiesCount(((resCourses.data as any[])?.length || 0) + ((resWorkshops.data as any[])?.length || 0));
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, []);

  const filtered = reservations.filter((r) => {
    const matchSearch = !search.trim() || r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.activity_name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" ||
      activityCategories[r.activity_name.toLowerCase()] === categoryFilter;
    return matchSearch && matchCategory;
  });

  const confirmCancel = async () => {
    if (!cancellingId) return;
    const resa = reservations.find(r => r.id === cancellingId);
    if (!resa) return;

    await supabase.from("reservations").update({ status: "annulé" }).eq("id", cancellingId);

    if (resa.schedule_id) {
      const { data: sched } = await supabase.from("course_schedules").select("spots_left").eq("id", resa.schedule_id).single();
      if (sched) {
        await supabase.from("course_schedules").update({ spots_left: sched.spots_left + resa.participants }).eq("id", resa.schedule_id);
      }
    } else if (resa.workshop_id) {
      const { data: ws } = await supabase.from("workshops").select("spots_left").eq("id", resa.workshop_id).single();
      if (ws) {
        await supabase.from("workshops").update({ spots_left: ws.spots_left + resa.participants }).eq("id", resa.workshop_id);
      }
    }

    toast({ title: "Réservation annulée", variant: "destructive" });
    setCancellingId(null);
    fetchReservations();
  };

  const reconfirm = async (id: string) => {
    const resa = reservations.find(r => r.id === id);
    if (!resa) return;

    if (resa.schedule_id) {
      const { data: sched } = await supabase.from("course_schedules").select("spots_left").eq("id", resa.schedule_id).single();
      if (sched && sched.spots_left >= resa.participants) {
        await supabase.from("course_schedules").update({ spots_left: sched.spots_left - resa.participants }).eq("id", resa.schedule_id);
      } else {
        toast({ title: "Plus de places disponibles", variant: "destructive" });
        return;
      }
    } else if (resa.workshop_id) {
      const { data: ws } = await supabase.from("workshops").select("spots_left").eq("id", resa.workshop_id).single();
      if (ws && ws.spots_left >= resa.participants) {
        await supabase.from("workshops").update({ spots_left: ws.spots_left - resa.participants }).eq("id", resa.workshop_id);
      } else {
        toast({ title: "Plus de places disponibles", variant: "destructive" });
        return;
      }
    }

    await supabase.from("reservations").update({ status: "confirmé" }).eq("id", id);
    toast({ title: "Réservation re-confirmée" });
    fetchReservations();
  };

  const totalConfirmed = reservations.filter(r => r.status === "confirmé").length;
  const totalCancelled = reservations.filter(r => r.status === "annulé").length;
  const upcoming = reservations.filter(r => r.status === "confirmé" && r.date >= new Date().toISOString().split("T")[0]).length;

  if (loading && viewMode === "list") {
    return (
      <AdminLayout title="Réservations">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Réservations">
      {/* Views & Filters bar */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" /> Liste
            </Button>
            <Button
              variant={viewMode === "planning" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setViewMode("planning")}
            >
              <CalendarDays className="h-4 w-4" /> Planning
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORY_FILTERS.map(f => {
              const isActive = categoryFilter === f.value;
              return (
                <Badge
                  key={f.value}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer text-xs gap-1 ${isActive && f.activeBg ? `${f.activeBg} text-white border-transparent hover:opacity-90` : ""}`}
                  onClick={() => setCategoryFilter(f.value)}
                >
                  {f.dot && <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : f.dot}`} />}
                  {f.label}
                </Badge>
              );
            })}
          </div>
          <div className="relative flex-1 w-full sm:w-auto sm:max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats cards — shown only in Planning mode */}
      {viewMode === "planning" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-primary-dark" />
              <span className="text-xs text-muted-foreground">Réservations du jour</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {reservations.filter(r => r.status === "confirmé" && r.date === new Date().toISOString().split("T")[0]).length}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Clients inscrits</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{new Set(reservations.map(r => r.client_name)).size}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Taux de remplissage</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{fillRate}%</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary-dark" />
              <span className="text-xs text-muted-foreground">Activités</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{activitiesCount}</p>
          </div>
        </div>
      )}

      {viewMode === "planning" ? (
        <DailyView categoryFilter={categoryFilter} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{filtered.filter(r => r.status === "confirmé").length}</p>
              <p className="text-xs text-muted-foreground">Confirmées</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{filtered.filter(r => r.status === "confirmé" && r.date >= new Date().toISOString().split("T")[0]).length}</p>
              <p className="text-xs text-muted-foreground">À venir</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{filtered.filter(r => r.status === "annulé").length}</p>
              <p className="text-xs text-muted-foreground">Annulées</p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Activité</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Horaire</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Pers.</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucune réservation trouvée</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="p-3 font-medium">{r.client_name}</td>
                      <td className="p-3">
                        <div>{r.activity_name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{r.activity_type === "course" ? "Cours" : "Atelier"}</div>
                      </td>
                      <td className="p-3">{new Date(r.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</td>
                      <td className="p-3">{r.time}{r.end_time ? ` - ${r.end_time}` : ""}</td>
                      <td className="p-3">{r.participants}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[r.status] || "bg-muted text-muted-foreground"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          {r.status === "confirmé" && (
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1 h-7 text-xs" onClick={() => setCancellingId(r.id)}>
                              <XCircle className="h-3.5 w-3.5" /> Annuler
                            </Button>
                          )}
                          {r.status === "annulé" && (
                            <Button size="sm" variant="ghost" className="text-primary-dark gap-1 h-7 text-xs" onClick={() => reconfirm(r.id)}>
                              <RotateCcw className="h-3.5 w-3.5" /> Rétablir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les places seront libérées et le client sera notifié de l'annulation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
