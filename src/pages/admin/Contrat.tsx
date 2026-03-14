import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Rocket, Server, Lightbulb, CheckCircle2, Clock, Gift, AlertTriangle, Zap, ArrowRight, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureRequest {
  id: string;
  urgency: number;
  impact: string;
  status: string;
  created_at: string;
}

const phases = [
  {
    name: "Phase 1 — Prototype",
    description: "Conception de l'interface, premier rendu et itérations",
    amount: 300,
    status: "En cours",
    offered: true,
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    name: "Phase 2 — Déploiement",
    description: "Configuration authentification, intégration Stripe, synchronisation des calendriers et transfert des historiques clients",
    amount: 300,
    status: "À venir",
    offered: true,
    icon: <ArrowRight className="h-5 w-5" />,
  },
];

const includedItems = [
  "Hébergement sécurisé et maintenance corrective (correction de bugs)",
  "Mises à jour de sécurité",
  "Quota de modifications : ajustements cosmétiques (textes, couleurs, images) dans la limite d'une session de mise à jour groupée par semaine",
];

// 2D pricing grid data
const GRID_ROWS = [
  { urgency: "Urgent", delay: "< 24h", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-destructive" },
  { urgency: "Important", delay: "< 3 jours", icon: <Zap className="h-3.5 w-3.5" />, color: "text-amber-700" },
  { urgency: "Cool", delay: "< 1 semaine", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "text-primary" },
  { urgency: "À discuter", delay: "à l'occasion", icon: <Clock className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
];

const GRID_COLS = [
  { impact: "Retouche", color: "text-emerald-700" },
  { impact: "Amélioration", color: "text-sky-700" },
  { impact: "Fonctionnalité", color: "text-violet-700" },
];

function getGridCost(urgencyIdx: number, impactKey: string): string {
  if (urgencyIdx === 3) return "Sur devis";
  if (impactKey === "Fonctionnalité") return "20€";
  return "Inclus";
}

function getGridCellColor(cost: string): string {
  if (cost === "Inclus") return "bg-emerald-500/10 text-emerald-700";
  if (cost === "20€") return "bg-violet-500/10 text-violet-700";
  return "bg-muted text-muted-foreground";
}

export default function AdminContrat() {
  const [tickets, setTickets] = useState<FeatureRequest[]>([]);

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    supabase
      .from("feature_requests")
      .select("id, urgency, impact, status, created_at")
      .gte("created_at", startOfMonth)
      .then(({ data }) => { if (data) setTickets(data as unknown as FeatureRequest[]); });
  }, []);

  // Monthly stats
  const paidTickets = tickets.filter(t => t.impact === "fonctionnalite" && t.urgency !== 4);
  const includedTickets = tickets.filter(t => t.impact !== "fonctionnalite" && t.urgency !== 4);
  const devisTickets = tickets.filter(t => t.urgency === 4);
  const monthlyCost = paidTickets.length * 20;

  return (
    <AdminLayout title="Contrat">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* --- Section A: Déploiement --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-primary-dark">État du Déploiement</h2>
          </div>
          <p className="text-sm text-muted-foreground">Investissement initial pour la mise en place de votre plateforme.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {phases.map((phase) => (
              <Card key={phase.name} className="relative overflow-hidden">
                {phase.offered && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[11px]">
                      <Gift className="h-3 w-3" /> Offert
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-primary-dark">
                    {phase.icon}
                    <CardTitle className="text-base">{phase.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">{phase.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-primary-dark line-through opacity-50">{phase.amount}€</span>
                    <span className="text-sm text-muted-foreground mb-0.5">offert</span>
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant="outline"
                      className={`text-[11px] ${
                        phase.status === "En cours"
                          ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                          : "bg-muted text-muted-foreground border-muted-foreground/20"
                      }`}
                    >
                      {phase.status === "En cours" ? <Clock className="h-3 w-3 mr-1" /> : null}
                      {phase.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* --- Section B: Abonnement --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-primary-dark">Abonnement de Service</h2>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Forfait MCO & Évolutions</CardTitle>
                  <CardDescription className="text-xs mt-1">Maintien en Condition Opérationnelle</CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-primary-dark">50€</span>
                  <span className="text-sm text-muted-foreground"> / mois</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2.5">
                {includedItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* --- Section C: Grille tarifaire --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-primary-dark">Grille Tarifaire des Demandes</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Le coût dépend du type de demande et de son niveau d'importance. Gérez vos idées depuis l'onglet{" "}
            <a href="/admin/fonctionnalites" className="text-primary underline underline-offset-2 font-medium">Fonctionnalités</a>.
          </p>

          {/* 2D Grid */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left text-muted-foreground font-medium text-xs">Importance ↓ / Type →</th>
                      {GRID_COLS.map(col => (
                        <th key={col.impact} className={`p-3 text-center font-semibold text-xs ${col.color}`}>{col.impact}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRID_ROWS.map((row, rIdx) => (
                      <tr key={row.urgency} className="border-b last:border-0">
                        <td className="p-3">
                          <div className={`flex items-center gap-1.5 font-medium text-xs ${row.color}`}>
                            {row.icon} {row.urgency}
                            <span className="text-muted-foreground font-normal ml-1">({row.delay})</span>
                          </div>
                        </td>
                        {GRID_COLS.map(col => {
                          const cost = getGridCost(rIdx, col.impact);
                          return (
                            <td key={col.impact} className="p-3 text-center">
                              <Badge variant="outline" className={`text-[11px] ${getGridCellColor(cost)}`}>
                                {cost}
                              </Badge>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly counter */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Ce mois-ci</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{includedTickets.length}</p>
                  <p className="text-[11px] text-muted-foreground">Incluses</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-violet-700">{paidTickets.length}</p>
                  <p className="text-[11px] text-muted-foreground">Payantes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-muted-foreground">{devisTickets.length}</p>
                  <p className="text-[11px] text-muted-foreground">Sur devis</p>
                </div>
              </div>
              {monthlyCost > 0 && (
                <div className="mt-3 pt-3 border-t text-center">
                  <p className="text-sm text-muted-foreground">Coût estimé supplémentaire</p>
                  <p className="text-xl font-bold text-primary-dark">{monthlyCost}€</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AdminLayout>
  );
}
