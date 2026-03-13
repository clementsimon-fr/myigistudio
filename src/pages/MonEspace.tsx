import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CreditCard, Clock, LogOut, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mockClientCards } from "@/data/mockData";

interface Reservation {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  date: string;
  time: string;
  end_time: string;
  participants: number;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  "confirmé": "bg-primary/15 text-primary-dark border-primary/30",
  "annulé": "bg-destructive/10 text-destructive border-destructive/30",
  "liste d'attente": "bg-accent/20 text-accent-foreground border-accent/30",
};

export default function MonEspace() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .eq("client_name", "Sophie")
        .order("date", { ascending: false });
      if (data) setReservations(data as unknown as Reservation[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const upcomingReservations = reservations.filter(
    r => r.status === "confirmé" && r.date >= new Date().toISOString().split("T")[0]
  );
  const totalCredits = mockClientCards.reduce((sum, c) => sum + (c.totalSessions - c.usedSessions), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark">Mon Espace</h1>
              <p className="text-muted-foreground text-sm">Bonjour Sophie 👋</p>
            </div>
            <div className="flex gap-2">
              <Link to="/reserver">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Réserver
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => navigate("/login")} className="gap-1.5 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{totalCredits}</p>
              <p className="text-xs text-muted-foreground">Crédits restants</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{mockClientCards.length}</p>
              <p className="text-xs text-muted-foreground">Cartes actives</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{upcomingReservations.length}</p>
              <p className="text-xs text-muted-foreground">Prochaines résa</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{reservations.length}</p>
              <p className="text-xs text-muted-foreground">Total réservations</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="reservations">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="reservations" className="gap-1.5">
                <CalendarDays className="h-4 w-4" /> Réservations
              </TabsTrigger>
              <TabsTrigger value="cartes" className="gap-1.5">
                <CreditCard className="h-4 w-4" /> Mes Cartes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reservations" className="mt-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">Aucune réservation pour le moment.</p>
                  <Link to="/reserver"><Button>Réserver maintenant</Button></Link>
                </div>
              ) : (
                reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px]">
                        <p className="text-lg font-bold text-primary-dark">
                          {new Date(r.date).getDate()}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase">
                          {new Date(r.date).toLocaleDateString("fr-FR", { month: "short" })}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">{r.activity_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {r.time}{r.end_time ? ` - ${r.end_time}` : ""}
                          {r.participants > 1 && <span>· {r.participants} pers.</span>}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[r.status] || ""}>
                      {r.status}
                    </Badge>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="cartes" className="mt-4 space-y-4">
              {mockClientCards.map((card) => {
                const remaining = card.totalSessions - card.usedSessions;
                const pct = (card.usedSessions / card.totalSessions) * 100;
                return (
                  <div key={card.id} className="rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-primary-dark">{card.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        Expire le {new Date(card.expiresAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary-dark transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {card.usedSessions}/{card.totalSessions}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {remaining} crédit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
