import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Loader2, XCircle, RotateCcw, List, CalendarDays } from "lucide-react";
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

export default function AdminReservations() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "daily">("daily");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .order("date", { ascending: false });
    if (data) setReservations(data as unknown as Reservation[]);
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, []);

  const filtered = reservations.filter((r) => {
    const matchSearch = r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.activity_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
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

  // Stats
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
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant={viewMode === "daily" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setViewMode("daily")}
        >
          <CalendarDays className="h-4 w-4" /> Planning
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setViewMode("list")}
        >
          <List className="h-4 w-4" /> Liste complète
        </Button>
      </div>

      {viewMode === "daily" ? (
        <DailyView />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{reservations.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{totalConfirmed}</p>
              <p className="text-xs text-muted-foreground">Confirmées</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{upcoming}</p>
              <p className="text-xs text-muted-foreground">À venir</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-destructive">{totalCancelled}</p>
              <p className="text-xs text-muted-foreground">Annulées</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client ou activité…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="confirmé">Confirmé</SelectItem>
                <SelectItem value="annulé">Annulé</SelectItem>
                <SelectItem value="liste d'attente">Liste d'attente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card overflow-x-auto">
            <table className="w-full text-sm">
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
