import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Rocket, Server, Lightbulb, CheckCircle2, Clock, Gift, AlertTriangle, Zap,
  BarChart3, Info, Palette, Database, Upload, HeartHandshake, ShieldCheck, Calendar,
  ChevronDown, Pencil, Save, X, FileDown
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useDemoContext } from "@/contexts/DemoContext";
import { useToast } from "@/hooks/use-toast";

interface FeatureRequest {
  id: string;
  urgency: number;
  impact: string;
  status: string;
  created_at: string;
}

// ── Timeline phases ──
const timelinePhases = [
  {
    name: "Prototype Fictif",
    subtitle: "Validation du concept",
    icon: Palette,
    status: "done" as const,
    cost: "250 €",
    costNote: "Offert",
    explanation:
      "C'est la « maquette » interactive de votre projet. Elle permet de tester l'ergonomie et le parcours de vos clients sans risque, pour valider que l'outil répond parfaitement à vos besoins avant de construire le moteur réel.",
    detail:
      "Logiques de navigation, design visuel, sans connexion ni base de données réelle.",
  },
  {
    name: "Développement",
    subtitle: "Version fonctionnelle",
    icon: Database,
    status: "in_progress" as const,
    cost: "250 €",
    costNote: "Offert",
    explanation:
      "Nous créons le moteur de l'application. À cette étape, l'application est opérationnelle : on peut créer un compte, réserver et payer. C'est une page blanche prête à recevoir votre activité.",
    detail:
      "Mise en place de la base de données, sécurité des comptes, intégration du système de paiement Stripe.",
  },
  {
    name: "Déploiement",
    subtitle: "Version complète & Migration",
    icon: Upload,
    status: "upcoming" as const,
    cost: "250 €",
    costNote: "Offert",
    explanation:
      "C'est le « Grand Saut ». Nous récupérons tous vos clients actuels de SimplyBook et Calendly pour les installer dans MyIgiStudio.\n\nÉtape 1 : Migration de l'historique et reconnaissance automatique par numéro de téléphone.\nÉtape 2 : Envoi d'une invitation officielle (Mail/SMS) à vos clients pour qu'ils découvrent leur nouvel espace.",
    detail:
      "Importation ETL, algorithme de matching, routage automatisé des notifications de bienvenue.",
  },
  {
    name: "Suivi",
    subtitle: "Garantie de lancement",
    icon: HeartHandshake,
    status: "upcoming" as const,
    cost: null,
    costNote: "Inclus dans l'abonnement",
    explanation:
      "Une fois l'application entre les mains de vos clients, je reste à vos côtés pour corriger les éventuels petits ajustements et m'assurer que tout fonctionne avec fluidité pendant les premières semaines.",
    detail:
      "Correction de bugs (Maintenance Corrective) et optimisation des performances.",
  },
  {
    name: "Maintien & Évolution",
    subtitle: "La vie de l'app",
    icon: ShieldCheck,
    status: "upcoming" as const,
    cost: null,
    costNote: "Inclus dans l'abonnement",
    explanation:
      "Votre application vit et grandit. Cette phase couvre l'hébergement sécurisé et les petites évolutions de forme pour que MyIgiStudio reste toujours moderne et performant.",
    detail:
      "Maintenance évolutive, mises à jour de sécurité, support prioritaire.",
  },
];

const STATUS_CONFIG = {
  done: {
    label: "Terminé",
    emoji: "✅",
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    line: "bg-emerald-500",
    dot: "bg-emerald-500 border-emerald-500",
  },
  in_progress: {
    label: "En cours",
    emoji: "⏳",
    badge: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    line: "bg-amber-400",
    dot: "bg-amber-400 border-amber-400 animate-pulse",
  },
  upcoming: {
    label: "À venir",
    emoji: "🗓️",
    badge: "bg-muted text-muted-foreground border-muted-foreground/20",
    line: "bg-border",
    dot: "bg-muted-foreground/30 border-muted-foreground/30",
  },
};

const includedItems = [
  "Hébergement sécurisé et maintenance corrective (correction de bugs)",
  "Mises à jour de sécurité",
  "Quota de modifications : ajustements cosmétiques (textes, couleurs, images) dans la limite d'une session de mise à jour groupée par semaine",
];

const IMPACT_TOOLTIPS: Record<string, string> = {
  Retouche: "Changements simples et rapides : modifier un texte, une couleur, une image, corriger une faute.",
  Amélioration: "Ajustements de structure : ajouter une section, réorganiser un bloc, modifier un formulaire existant.",
  Création: "Développement d'une nouvelle fonctionnalité complète : système de chat, nouveau module, intégration externe.",
};

const GRID_ROWS = [
  { urgency: "Urgent", delay: "< 24h", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-destructive" },
  { urgency: "Important", delay: "< 3 jours", icon: <Zap className="h-3.5 w-3.5" />, color: "text-amber-700" },
  { urgency: "Cool", delay: "< 1 semaine", icon: <Lightbulb className="h-3.5 w-3.5" />, color: "text-primary" },
  { urgency: "À discuter", delay: "à l'occasion", icon: <Clock className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
];

const GRID_COLS = [
  { impact: "Retouche", color: "text-emerald-700" },
  { impact: "Amélioration", color: "text-sky-700" },
  { impact: "Création", color: "text-violet-700" },
];

function getGridCost(_urgencyIdx: number, impactKey: string): string {
  if (impactKey === "Création") return "50€";
  return "Inclus";
}

function getGridCellColor(cost: string): string {
  if (cost === "Inclus") return "bg-emerald-500/10 text-emerald-700";
  if (cost === "50€") return "bg-violet-500/10 text-violet-700";
  return "bg-muted text-muted-foreground";
}

// ── Timeline Step Component with Collapsible ──
function TimelineStep({ phase, isLast, isFournisseur, onEdit, onSave }: {
  phase: typeof timelinePhases[0]; isLast: boolean; isFournisseur: boolean;
  onEdit?: (phase: typeof timelinePhases[0]) => void;
  onSave?: (phaseName: string, updates: Partial<typeof timelinePhases[0]>) => void;
}) {
  const config = STATUS_CONFIG[phase.status];
  const Icon = phase.icon;
  const [isOpen, setIsOpen] = useState(phase.status === "in_progress");
  const [editing, setEditing] = useState(false);
  const [editExplanation, setEditExplanation] = useState(phase.explanation);
  const [editDetail, setEditDetail] = useState(phase.detail);
  const [editCost, setEditCost] = useState(phase.cost || "");
  const [editOffert, setEditOffert] = useState(phase.costNote === "Offert");
  const [editStatus, setEditStatus] = useState<"done" | "in_progress" | "upcoming">(phase.status);

  const handleSave = () => {
    onSave?.(phase.name, {
      explanation: editExplanation,
      detail: editDetail,
      cost: editCost || null,
      costNote: editOffert ? "Offert" : (editCost ? editCost : phase.costNote),
      status: editStatus,
    });
    setEditing(false);
  };

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center shrink-0 ${config.dot} bg-card`}>
          <Icon className={`h-5 w-5 ${phase.status === "done" ? "text-emerald-600" : phase.status === "in_progress" ? "text-amber-600" : "text-muted-foreground/50"}`} />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[2rem] ${config.line}`} />
        )}
      </div>

      <div className="pb-6 flex-1">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className={`rounded-xl border overflow-hidden transition-shadow ${phase.status === "in_progress" ? "ring-1 ring-amber-400/40 shadow-md" : ""}`}>
            <CollapsibleTrigger asChild>
              <button className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <span className="text-base font-display font-semibold text-primary-dark">{phase.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{phase.subtitle}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {phase.cost && (
                      <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[11px]">
                        <Gift className="h-3 w-3" />
                        {phase.costNote === "Offert" ? (
                          <>
                            <span className="line-through opacity-60 mr-1">{phase.cost}</span>
                            Offert
                          </>
                        ) : (
                          <span>{phase.cost}</span>
                        )}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[11px] ${config.badge}`}>
                      {phase.status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
                      {config.label} {config.emoji}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 pt-1 space-y-3 border-t">
                {editing && isFournisseur ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Explication</Label>
                      <Textarea value={editExplanation} onChange={e => setEditExplanation(e.target.value)} rows={4} className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Détail technique</Label>
                      <Textarea value={editDetail} onChange={e => setEditDetail(e.target.value)} rows={2} className="mt-1 text-sm" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-xs font-medium">Prix (€)</Label>
                        <Input value={editCost} onChange={e => setEditCost(e.target.value)} className="mt-1 w-28 h-8 text-sm" placeholder="250 €" />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <Switch checked={editOffert} onCheckedChange={setEditOffert} id={`offert-${phase.name}`} />
                        <Label htmlFor={`offert-${phase.name}`} className="text-xs cursor-pointer">Offert</Label>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Statut</Label>
                        <select value={editStatus} onChange={e => setEditStatus(e.target.value as any)} className="mt-1 block h-8 text-xs rounded-md border border-input bg-background px-2">
                          <option value="done">Terminé</option>
                          <option value="in_progress">En cours</option>
                          <option value="upcoming">À venir</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1 text-xs" onClick={handleSave}>
                        <Save className="h-3 w-3" /> Sauvegarder
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(false)}>
                        <X className="h-3 w-3" /> Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{phase.explanation}</p>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[11px] text-muted-foreground font-medium mb-1">🔧 Détail technique</p>
                      <p className="text-xs text-muted-foreground">{phase.detail}</p>
                    </div>
                    {!phase.cost && (
                      <p className="text-xs text-muted-foreground italic">{phase.costNote}</p>
                    )}
                    {isFournisseur && (
                      <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
                        <Pencil className="h-3 w-3" /> Modifier
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

export default function AdminContrat() {
  const { currentProfile } = useDemoContext();
  const { toast } = useToast();
  const isFournisseur = currentProfile?.role === "fournisseur";
  const [tickets, setTickets] = useState<FeatureRequest[]>([]);
  const [phases, setPhases] = useState(timelinePhases);
  
  // Editing state for fournisseur
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("50");
  const [editIncluded, setEditIncluded] = useState(includedItems.join("\n"));

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    supabase
      .from("feature_requests")
      .select("id, urgency, impact, status, created_at")
      .gte("created_at", startOfMonth)
      .then(({ data }) => { if (data) setTickets(data as unknown as FeatureRequest[]); });
  }, []);

  const paidTickets = tickets.filter(t => t.impact === "fonctionnalite");
  const includedTickets = tickets.filter(t => t.impact !== "fonctionnalite");
  const monthlyCost = paidTickets.length * 50;

  const handleSavePhase = (phaseName: string, updates: Partial<typeof timelinePhases[0]>) => {
    setPhases(prev => prev.map(p => p.name === phaseName ? { ...p, ...updates } : p));
    toast({ title: `Phase "${phaseName}" mise à jour ✓` });
  };

  const handlePrintScreens = () => {
    const routes = [
      "/", "/?view=planning-type", "/?view=planning",
      "/login", "/register", "/mon-espace",
      "/admin/activites", "/admin/planning-type", "/admin/contenu",
      "/admin/tarifs", "/admin/bons-cadeaux", "/admin/conditions",
      "/admin/intervenants", "/admin/clients", "/admin/contrat",
      "/admin/fonctionnalites", "/admin/parametres",
    ];
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Popup bloquée, autorisez les popups", variant: "destructive" }); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Screens MyIgiStudio</title>
      <style>body{font-family:sans-serif;margin:20px}iframe{border:1px solid #ccc;margin:10px 0;page-break-after:always}
      h2{font-size:14px;margin:30px 0 5px;color:#333}.header{text-align:center;margin-bottom:30px}
      @media print{.no-print{display:none}iframe{height:700px!important}}</style></head><body>
      <div class="header"><h1>MyIgiStudio — Screens Application</h1>
      <p style="color:#666">Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
      <button class="no-print" onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;margin:10px">🖨️ Imprimer / PDF</button></div>`);
    for (const route of routes) {
      const url = window.location.origin + route;
      w.document.write(`<h2>${route}</h2><iframe src="${url}" width="100%" height="600" loading="lazy"></iframe>`);
    }
    w.document.write("</body></html>");
    w.document.close();
  };

  return (
    <AdminLayout title="Contrat">
      <div className="max-w-3xl mx-auto space-y-8 overflow-x-hidden">

        {/* PDF Export Button */}
        <Button variant="outline" className="gap-2" onClick={handlePrintScreens}>
          📄 Télécharger tous les screens (PDF)
        </Button>

        {/* --- Section A: Timeline Déploiement --- */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-primary-dark">État du Déploiement</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Les 5 étapes clés de la mise en place de MyIgiStudio, de la maquette à la vie de l'application.
          </p>

          <div className="mt-2">
            {phases.map((phase, i) => (
              <TimelineStep
                key={phase.name}
                phase={phase}
                isLast={i === phases.length - 1}
                isFournisseur={isFournisseur}
                onSave={handleSavePhase}
              />
            ))}
          </div>
        </section>

        <Separator />

        {/* --- Section B: Abonnement --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-display font-bold text-primary-dark">Abonnement de Service</h2>
            </div>
            {isFournisseur && editingSection !== "abonnement" && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground" onClick={() => setEditingSection("abonnement")}>
                <Pencil className="h-3 w-3" /> Modifier
              </Button>
            )}
          </div>

          {editingSection === "abonnement" && isFournisseur ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium">Prix mensuel (€)</label>
                  <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} className="mt-1 w-32" />
                </div>
                <div>
                  <label className="text-sm font-medium">Inclus (un par ligne)</label>
                  <Textarea value={editIncluded} onChange={e => setEditIncluded(e.target.value)} rows={4} className="mt-1" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => { toast({ title: "Abonnement mis à jour ✓" }); setEditingSection(null); }}>
                    <Save className="h-3 w-3" /> Sauvegarder
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)}>
                    <X className="h-3 w-3" /> Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
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
          )}
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

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left text-muted-foreground font-medium text-xs">Importance ↓ / Type →</th>
                      {GRID_COLS.map(col => (
                        <th key={col.impact} className={`p-3 text-center font-semibold text-xs ${col.color}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                {col.impact}
                                <Info className="h-3 w-3 opacity-50" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[220px] text-xs">
                              {IMPACT_TOOLTIPS[col.impact]}
                            </TooltipContent>
                          </Tooltip>
                        </th>
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

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Ce mois-ci</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-700">{includedTickets.length}</p>
                  <p className="text-[11px] text-muted-foreground">Incluses</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-violet-700">{paidTickets.length}</p>
                  <p className="text-[11px] text-muted-foreground">Créations (50€)</p>
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
