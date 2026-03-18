import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, ArrowLeft, RotateCcw, X, Sparkles, Heart, Wrench, GraduationCap } from "lucide-react";
import {
  MATRICE, POLE_CONFIG, TIME_OPTIONS, CHARGE_OPTIONS, ENVIE_OPTIONS,
  type MissionAnswers, type Pole, type GapLevel,
  computeGap, computeFreeableHours, getLovedMissions, getSuggestedFeatures,
} from "@/data/matriceData";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

const STEPS = ["Diagnostic", "Résultats", "Le Sens", "Solutions"];

const GAP_CONFIG: Record<GapLevel, { label: string; color: string; bg: string }> = {
  aligned: { label: "Aligné", color: "text-emerald-700", bg: "bg-emerald-500/15 border-emerald-500/30" },
  adjustable: { label: "Ajustable", color: "text-amber-700", bg: "bg-amber-500/15 border-amber-500/30" },
  critical: { label: "Écart important", color: "text-destructive", bg: "bg-destructive/15 border-destructive/30" },
};

export default function PrendreRecul({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, MissionAnswers>>({});

  const poles = ["gestion", "pilotage", "production"] as Pole[];
  const totalQuestions = MATRICE.length * 3;
  const answeredCount = Object.values(answers).reduce((sum, a) => {
    return sum + (a.temps ? 1 : 0) + (a.charge ? 1 : 0) + (a.envie ? 1 : 0);
  }, 0);
  const allAnswered = answeredCount === totalQuestions;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const freeableHours = useMemo(() => computeFreeableHours(answers), [answers]);
  const lovedMissions = useMemo(() => getLovedMissions(answers), [answers]);
  const suggestedFeatures = useMemo(() => getSuggestedFeatures(answers), [answers]);

  const setAnswer = (missionId: string, field: keyof MissionAnswers, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [missionId]: { ...prev[missionId], [field]: value },
    }));
  };

  const reset = () => {
    setAnswers({});
    setStep(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-xl font-semibold text-primary-dark">Prendre du Recul</h1>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-1 mb-1">
          {STEPS.map((s, i) => (
            <div key={s} className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors",
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary-dark" : "bg-muted text-muted-foreground"
            )}>{s}</div>
          ))}
        </div>
        {step === 0 && <Progress value={progressPercent} className="h-1.5 mb-4" />}
        {step !== 0 && <div className="mb-4" />}

        {/* Content */}
        <div className="flex-1">
          {step === 0 && <Step1 poles={poles} answers={answers} setAnswer={setAnswer} />}
          {step === 1 && <Step2 answers={answers} />}
          {step === 2 && <Step3 answers={answers} freeableHours={freeableHours} lovedMissions={lovedMissions} />}
          {step === 3 && <Step4 suggestedFeatures={suggestedFeatures} answers={answers} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mt-6">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
          ) : <div />}
          {step === 0 && (
            <Button size="sm" onClick={() => setStep(1)} disabled={!allAnswered} className="gap-1">
              Voir mes résultats <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 1 && (
            <Button size="sm" onClick={() => setStep(2)} className="gap-1">
              Comprendre mes résultats <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" onClick={() => setStep(3)} className="gap-1">
              Voir les solutions <Sparkles className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Recommencer
              </Button>
              <Button size="sm" onClick={onClose}>Fermer</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Diagnostic ─── */
function Step1({ poles, answers, setAnswer }: {
  poles: Pole[];
  answers: Record<string, MissionAnswers>;
  setAnswer: (id: string, field: keyof MissionAnswers, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground italic text-center">
        Prenons 5 minutes pour aligner votre quotidien avec votre vision.
      </p>
      {poles.map(pole => {
        const cfg = POLE_CONFIG[pole];
        const missions = MATRICE.filter(m => m.pole === pole);
        return (
          <div key={pole}>
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <span>{cfg.emoji}</span> {cfg.label}
            </h3>
            <div className="space-y-3">
              {missions.map(m => {
                const a = answers[m.id] || {};
                return (
                  <div key={m.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <p className="text-sm font-medium">{m.missionShort}</p>
                    <p className="text-[11px] text-muted-foreground">{m.mission}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <ChoiceGroup label="Temps passé" options={TIME_OPTIONS} value={a.temps} onChange={v => setAnswer(m.id, "temps", v)} />
                      <ChoiceGroup label="Charge mentale" options={CHARGE_OPTIONS} value={a.charge} onChange={v => setAnswer(m.id, "charge", v)} />
                      <ChoiceGroup label="Envie" options={ENVIE_OPTIONS} value={a.envie} onChange={v => setAnswer(m.id, "envie", v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceGroup({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string; emoji: string }[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-1">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "text-[10px] px-1.5 py-1 rounded border text-left transition-colors",
              value === o.value
                ? "bg-primary/15 border-primary/40 text-primary-dark font-medium"
                : "bg-card border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            {o.emoji} {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 2: Results ─── */
function Step2({ answers }: { answers: Record<string, MissionAnswers> }) {
  const poles = ["gestion", "pilotage", "production"] as Pole[];
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground italic text-center">
        Voici votre réalité comparée aux recommandations.
      </p>
      {poles.map(pole => {
        const cfg = POLE_CONFIG[pole];
        const missions = MATRICE.filter(m => m.pole === pole);
        return (
          <div key={pole}>
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <span>{cfg.emoji}</span> {cfg.label}
            </h3>
            <div className="space-y-2">
              {missions.map(m => {
                const a = answers[m.id] || {};
                const gap = computeGap(a, m);
                const gapCfg = GAP_CONFIG[gap];
                const timeLabel = TIME_OPTIONS.find(o => o.value === a.temps);
                const chargeLabel = CHARGE_OPTIONS.find(o => o.value === a.charge);
                const envieLabel = ENVIE_OPTIONS.find(o => o.value === a.envie);
                return (
                  <div key={m.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{m.missionShort}</p>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", gapCfg.bg, gapCfg.color)}>
                        {gapCfg.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {timeLabel && <Badge variant="secondary" className="text-[10px]">{timeLabel.emoji} {timeLabel.label}</Badge>}
                      {chargeLabel && <Badge variant="secondary" className="text-[10px]">{chargeLabel.emoji} {chargeLabel.label}</Badge>}
                      {envieLabel && <Badge variant="secondary" className="text-[10px]">{envieLabel.emoji} {envieLabel.label}</Badge>}
                    </div>
                    <Separator />
                    <div className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Recommandation :</span>{" "}
                      {m.arbitrageRecommande}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step 3: Meaning ─── */
function Step3({ answers, freeableHours, lovedMissions }: {
  answers: Record<string, MissionAnswers>;
  freeableHours: number;
  lovedMissions: typeof MATRICE;
}) {
  const lovedExceptions = MATRICE.filter(m => {
    const a = answers[m.id];
    return a?.envie === "adore" && ["automatiser", "deleguer", "simplifier"].includes(m.recommendedAction);
  });

  const needsCompetence = MATRICE.filter(m => {
    const gap = computeGap(answers[m.id] || {}, m);
    return gap !== "aligned" && (m.besoinType === "competence" || m.besoinType === "les_deux");
  });

  const needsOutil = MATRICE.filter(m => {
    const gap = computeGap(answers[m.id] || {}, m);
    return gap !== "aligned" && (m.besoinType === "outil" || m.besoinType === "les_deux");
  });

  return (
    <div className="space-y-6">
      {/* Freeable time */}
      {freeableHours > 0 && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-center space-y-2">
          <p className="text-2xl font-display font-bold text-primary-dark">~{freeableHours}h / semaine</p>
          <p className="text-sm text-muted-foreground">
            En ajustant les tâches que vous n'aimez pas, vous libérez ce temps.
          </p>
          {lovedMissions.length > 0 && (
            <p className="text-sm text-foreground">
              Imaginez ce temps pour{" "}
              <span className="font-semibold text-primary-dark">
                {lovedMissions.map(m => m.missionShort.toLowerCase()).join(", ")}
              </span>.
            </p>
          )}
        </div>
      )}

      {freeableHours === 0 && (
        <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
          <p className="text-sm text-emerald-700 font-medium">
            Vous semblez bien alignée avec votre quotidien. Bravo ! 🌿
          </p>
        </div>
      )}

      {/* Loved exceptions */}
      {lovedExceptions.length > 0 && (
        <div className="space-y-2">
          {lovedExceptions.map(m => (
            <div key={m.id} className="rounded-lg border bg-card p-3 flex items-start gap-2.5">
              <Heart className="h-4 w-4 text-pink-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Vous aimez « {m.missionShort} » ?</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Parfait. Ce n'est plus une corvée mais un temps de ressourcement. Notre recommandation s'adapte à votre envie.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Needs */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Vos besoins identifiés</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <GraduationCap className="h-4 w-4 text-violet-600" /> Compétences
            </div>
            {needsCompetence.length === 0 && <p className="text-xs text-muted-foreground">Aucun besoin identifié</p>}
            {needsCompetence.map(m => (
              <p key={m.id} className="text-xs text-muted-foreground">• {m.missionShort}</p>
            ))}
          </div>
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Wrench className="h-4 w-4 text-sky-600" /> Outils
            </div>
            {needsOutil.length === 0 && <p className="text-xs text-muted-foreground">Aucun besoin identifié</p>}
            {needsOutil.map(m => (
              <p key={m.id} className="text-xs text-muted-foreground">• {m.missionShort}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 4: Value Proposition ─── */
function Step4({ suggestedFeatures, answers }: {
  suggestedFeatures: typeof MATRICE;
  answers: Record<string, MissionAnswers>;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground italic text-center">
        Voici les fonctionnalités qui pourraient vous aider au quotidien.
      </p>

      {suggestedFeatures.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune fonctionnalité supplémentaire n'est suggérée — vous êtes bien alignée ! 🌿
          </p>
        </div>
      )}

      <div className="space-y-3">
        {suggestedFeatures.map(m => {
          const gap = computeGap(answers[m.id] || {}, m);
          const gapCfg = GAP_CONFIG[gap];
          const poleCfg = POLE_CONFIG[m.pole];
          return (
            <div key={m.id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold">{m.featureSuggestion}</h4>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", gapCfg.bg, gapCfg.color)}>
                  {gapCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{m.featureDescription}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={cn("text-[10px]", poleCfg.color)}>{poleCfg.emoji} {poleCfg.label}</Badge>
                <Badge variant="secondary" className="text-[10px]">{m.missionShort}</Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {m.besoinType === "outil" ? "🔧 Outil" : m.besoinType === "competence" ? "🎓 Compétence" : "🔧+🎓"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
