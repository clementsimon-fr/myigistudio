import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Rocket, Server, Lightbulb, CheckCircle2, Clock, Gift, AlertTriangle, Zap, ArrowRight } from "lucide-react";

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

const featureTiers = [
  {
    level: "Urgent",
    price: "Inclus",
    description: "Intervention prioritaire en cas de blocage du système",
    color: "bg-destructive/15 text-destructive border-destructive/30",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    level: "Important",
    price: "20€ / ticket",
    description: "Ex : ajout d'un nouveau type de prestation, modification complexe de la logique de réservation",
    color: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    level: "Évolution Majeure",
    price: "Sur devis",
    description: "Ex : ajout d'un module boutique e-commerce",
    color: "bg-primary/15 text-primary-dark border-primary/30",
    icon: <Lightbulb className="h-4 w-4" />,
  },
];

export default function AdminContrat() {
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

        {/* --- Section C: Système de fonctionnalités --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-primary-dark">Demandes de Fonctionnalités</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Système de demande d'évolution selon les priorités. Gérez vos idées depuis l'onglet{" "}
            <a href="/admin/fonctionnalites" className="text-primary underline underline-offset-2 font-medium">Fonctionnalités</a>.
          </p>

          <div className="space-y-3">
            {featureTiers.map((tier) => (
              <Card key={tier.level}>
                <CardContent className="flex items-center gap-4 py-4 px-5">
                  <Badge variant="outline" className={`shrink-0 gap-1.5 ${tier.color}`}>
                    {tier.icon} {tier.level}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-dark whitespace-nowrap">{tier.price}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
