import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, ArrowRight, X, Check, Sparkles, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ─── Mood types ───

type Mood = "sereine" | "nuageux" | "sous-eau" | null;

const MOODS = [
  { key: "sereine" as const, emoji: "🌞", label: "Sereine & Inspirée" },
  { key: "nuageux" as const, emoji: "⛅", label: "Un peu nuageux" },
  { key: "sous-eau" as const, emoji: "⛈️", label: "Sous l'eau" },
];

// ─── Breathing animation ───

type BreathFormat = "court" | "moyen" | "long";
const BREATH_FORMATS: { key: BreathFormat; label: string; rounds: number; sideSeconds: number }[] = [
  { key: "court", label: "Court", rounds: 5, sideSeconds: 5 },
  { key: "moyen", label: "Moyen", rounds: 7, sideSeconds: 5 },
  { key: "long", label: "Long", rounds: 10, sideSeconds: 5 },
];

function playBell(frequency = 800, duration = 0.6, volume = 0.08) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playEndBell() {
  playBell(528, 2, 0.15);
}

function BreathingExercise({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [format, setFormat] = useState<BreathFormat>("court");
  const [seconds, setSeconds] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0); // 0-3 for 4 sides
  const [currentRound, setCurrentRound] = useState(1);
  const [breathLabel, setBreathLabel] = useState("Inspirez");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const breathRef = useRef<ReturnType<typeof setInterval>>();

  const BREATH_LABELS = ["Inspirez", "Bloquez", "Expirez", "Bloquez"];

  const selectedFormat = BREATH_FORMATS.find(f => f.key === format)!;
  const totalSeconds = selectedFormat.rounds * 4 * selectedFormat.sideSeconds;
  const totalMinSec = `${Math.floor(totalSeconds / 60)}min${totalSeconds % 60 > 0 ? `${(totalSeconds % 60).toString().padStart(2, "0")}` : ""}`;

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    clearInterval(breathRef.current);
    setPhase("done");
    playEndBell();
  }, []);

  const start = () => {
    const totalSec = selectedFormat.rounds * 4 * selectedFormat.sideSeconds;
    setPhase("running");
    setSeconds(totalSec);
    setBreathPhase(0);
    setCurrentRound(1);
    setBreathLabel(BREATH_LABELS[0]);
    playBell();

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          clearInterval(breathRef.current);
          playEndBell();
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let bIdx = 0;
    let roundCount = 1;
    breathRef.current = setInterval(() => {
      bIdx = (bIdx + 1) % 4;
      if (bIdx === 0) roundCount++;
      setBreathPhase(bIdx);
      setBreathLabel(BREATH_LABELS[bIdx]);
      setCurrentRound(roundCount);
      playBell();
    }, selectedFormat.sideSeconds * 1000);
  };

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(breathRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const sideColors = [0, 1, 2, 3].map(i =>
    i === breathPhase && phase === "running" ? "bg-primary" : "bg-muted"
  );

  if (phase === "done") {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="text-4xl">🕊️</div>
        <p className="text-sm text-muted-foreground">Bravo, vous avez pris un moment pour vous recentrer.</p>
        <Button size="sm" onClick={onDone}>Continuer</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <h4 className="font-display font-semibold text-base mb-2">🌬️ Respiration carrée</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Visualisez un carré devant vous. Synchronisez votre respiration sur les côtés :
          inspirez (côté 1), bloquez (côté 2), expirez (côté 3), bloquez (côté 4). Répétez.
        </p>
      </div>

      {phase === "idle" ? (
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {BREATH_FORMATS.map(f => {
              const dur = f.rounds * 4 * f.sideSeconds;
              const label = `${Math.floor(dur / 60)}min${dur % 60 > 0 ? (dur % 60).toString().padStart(2, "0") : ""}`;
              return (
                <button
                  key={f.key}
                  onClick={() => setFormat(f.key)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    format === f.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  {f.label} ({label})
                </button>
              );
            })}
          </div>
          <div className="text-center">
            <Button onClick={start} className="gap-2">
              <Sparkles className="h-4 w-4" /> Lancer {totalMinSec}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* Breathing square */}
          <div className="relative w-32 h-32">
            <div className={`absolute top-0 left-2 right-2 h-2 rounded-full transition-colors duration-700 ${sideColors[0]}`} />
            <div className={`absolute top-2 right-0 bottom-2 w-2 rounded-full transition-colors duration-700 ${sideColors[1]}`} />
            <div className={`absolute bottom-0 left-2 right-2 h-2 rounded-full transition-colors duration-700 ${sideColors[2]}`} />
            <div className={`absolute top-2 left-0 bottom-2 w-2 rounded-full transition-colors duration-700 ${sideColors[3]}`} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-primary animate-pulse">{breathLabel}</span>
            </div>
          </div>
          <div className="text-2xl font-mono text-foreground">{formatTime(seconds)}</div>
          <p className="text-xs text-muted-foreground">Tour {currentRound}/{selectedFormat.rounds}</p>
          <Button size="sm" variant="outline" onClick={stop} className="gap-1 text-xs">
            <X className="h-3 w-3" /> Terminer
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Gratitude page ───

function GratitudePage({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-4 py-4">
      <h4 className="font-display font-semibold text-base text-center">🙏 Gratitude</h4>
      <p className="text-xs text-muted-foreground text-center">Je dis merci à…</p>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Prenez un instant pour écrire ce qui vous inspire de la gratitude aujourd'hui…"
        className="min-h-[120px] text-sm"
      />
      <div className="flex justify-center">
        <Button size="sm" onClick={onDone} className="gap-1">
          <Check className="h-3 w-3" /> Terminer
        </Button>
      </div>
    </div>
  );
}

// ─── Mood card content ───

function MoodCard({ mood, onClose }: { mood: Mood; onClose: () => void }) {
  const [step, setStep] = useState<"message" | "breathing" | "gratitude">("message");

  if (mood === "sereine") {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm leading-relaxed">
            Peut-être pourriez-vous prendre quelques minutes pour clarifier les raisons / besoins nourris :
            au fond, c'est grâce à quoi ? 😊 Je vous souhaite une belle journée.
          </p>
          <Button size="sm" variant="outline" onClick={onClose}>Quitter</Button>
        </CardContent>
      </Card>
    );
  }

  if (mood === "nuageux") {
    if (step === "breathing") {
      return (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-5">
            <BreathingExercise onDone={() => setStep("gratitude")} />
          </CardContent>
        </Card>
      );
    }
    if (step === "gratitude") {
      return (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-5">
            <GratitudePage onDone={onClose} />
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm leading-relaxed">
            Peut-être pourriez-vous recentrer l'énergie sur l'essentiel, prendre de la hauteur ?
            Je vous invite à essayer cela.
          </p>
          <Button size="sm" onClick={() => setStep("breathing")} className="gap-1">
            <Sparkles className="h-3 w-3" /> 3 min pour se centrer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mood === "sous-eau") {
    return (
      <Card className="border-secondary/30 bg-secondary/5">
        <CardContent className="p-5 space-y-3">
          <p className="text-sm leading-relaxed">
            Quand nous sommes sous l'eau, nous pouvons remonter à la surface, par l'ancrage et le regard.
          </p>
          <Button size="sm" variant="outline" disabled className="gap-1">
            À venir
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// ─── Today stats ───

function TodayStats() {
  const [eventCount, setEventCount] = useState(0);
  const [inscriptionCount, setInscriptionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const todayDay = dayNames[new Date().getDay()];

      const [schedRes, workshopRes, resRes] = await Promise.all([
        supabase.from("course_schedules").select("id").eq("day", todayDay),
        supabase.from("workshops").select("id").eq("date", todayStr),
        supabase.from("reservations").select("id").eq("date", todayStr),
      ]);

      setEventCount((schedRes.data?.length || 0) + (workshopRes.data?.length || 0));
      setInscriptionCount(resRes.data?.length || 0);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Aujourd'hui au studio
        </h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : (
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-dark">{eventCount}</div>
              <div className="text-[10px] text-muted-foreground">événement{eventCount > 1 ? "s" : ""}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-dark">{inscriptionCount}</div>
              <div className="text-[10px] text-muted-foreground">inscription{inscriptionCount > 1 ? "s" : ""}</div>
            </div>
          </div>
        )}
        <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => navigate("/admin/planning")}>
          <ArrowRight className="h-3 w-3" /> Planning et réservations
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main page ───

export default function AdminBonjour() {
  const [mood, setMood] = useState<Mood>(null);

  return (
    <AdminLayout title="Bonjour">
      <div className="max-w-xl mx-auto space-y-6">
        {/* 1.1 Greeting */}
        <div className="text-center pt-4">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark">
            Bonjour Élodie ✨
          </h1>
        </div>

        {/* 1.2 Mood */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-center">
              Quelle est votre météo intérieure aujourd'hui ?
            </h3>
            <div className="flex justify-center gap-3">
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMood(mood === m.key ? null : m.key)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all text-center ${
                    mood === m.key
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] font-medium text-foreground leading-tight max-w-[80px]">{m.label}</span>
                </button>
              ))}
            </div>
            {mood && <MoodCard mood={mood} onClose={() => setMood(null)} />}
          </CardContent>
        </Card>

        {/* 1.3 Today stats */}
        <TodayStats />

        {/* 1.4 Customization placeholder */}
        <Card className="border-dashed">
          <CardContent className="p-5 text-center space-y-2">
            <Settings className="h-5 w-5 mx-auto text-muted-foreground" />
            <h3 className="font-display font-semibold text-sm">Personnaliser votre espace Bonjour</h3>
            <p className="text-xs text-muted-foreground">
              Personnalisez les boutons météo, créez de nouvelles séquences de bien-être.
            </p>
            <Badge variant="outline" className="text-[10px]">Bientôt disponible</Badge>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
