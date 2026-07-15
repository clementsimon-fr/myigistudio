import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Users } from "lucide-react";
import { CATEGORIES, getIntensityLabel, type UnifiedActivity, type Schedule } from "./types";

const CATEGORY_TEXT: Record<string, string> = {
  yoga: "text-[hsl(210,60%,40%)]",
  poterie: "text-[hsl(40,76%,35%)]",
};

const DAY_INDEX: Record<string, number> = {
  Dimanche: 0, Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6,
};

function getNextInfo(a: UnifiedActivity): { label: string; spotsLeft: number } | null {
  if (a.source === "course" && a.schedules && a.schedules.length > 0) {
    const today = new Date();
    const dayIdx = today.getDay();
    let minDiff = Infinity;
    for (const s of a.schedules) {
      const target = DAY_INDEX[s.day];
      if (target === undefined) continue;
      let diff = target - dayIdx;
      if (diff < 0) diff += 7;
      if (diff < minDiff) minDiff = diff;
    }
    if (minDiff === Infinity) return null;
    const next = new Date(today);
    next.setDate(today.getDate() + minDiff);
    const spotsLeft = Math.min(...a.schedules.map((s: Schedule) => s.spots_left));
    return { label: next.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), spotsLeft };
  }
  if (a.source === "workshop" && a.workshopEvents && a.workshopEvents.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = a.workshopEvents
      .filter((w) => new Date(w.date + "T12:00:00") >= today)
      .sort((x, y) => x.date.localeCompare(y.date));
    const next = future[0];
    if (!next) return null;
    return { label: new Date(next.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), spotsLeft: next.spots_left };
  }
  return null;
}

export function ActivityCard({ activity: a, onEdit, onDuplicate }: { activity: UnifiedActivity; onEdit: () => void; onDuplicate: () => void }) {
  const cat = CATEGORIES.find(c => c.value === a.category);
  const catLabel = cat?.label || a.category;
  const catDot = cat?.dot || "";
  const intensityLabel = getIntensityLabel(a.intensity);
  const titleColor = CATEGORY_TEXT[a.category] || "text-primary-dark";
  const nextInfo = getNextInfo(a);

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all group relative">
      <Button
        size="icon" variant="ghost"
        className="absolute top-2 right-2 z-10 h-7 w-7 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        title="Dupliquer"
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>

      {a.image && (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img src={a.image} alt={a.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 md:p-5">
        <h3 className={`font-display font-semibold text-base md:text-lg leading-tight ${titleColor}`}>{a.name}</h3>
        {a.description && <p className="text-xs md:text-sm text-muted-foreground mb-3 mt-0.5 line-clamp-2">{a.description}</p>}

        {nextInfo && (
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2 flex-wrap capitalize">
            <span>📅 Prochain : {nextInfo.label}</span>
            <Badge variant="outline" className="text-[10px] gap-1 normal-case">
              <Users className="h-2.5 w-2.5" /> {nextInfo.spotsLeft} place{nextInfo.spotsLeft > 1 ? "s" : ""}
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            {catDot && <div className={`w-1.5 h-1.5 rounded-full ${catDot}`} />}
            {catLabel}
          </Badge>
          {intensityLabel && <Badge variant="secondary" className="text-[10px]">{intensityLabel}</Badge>}
          <span className="text-xs text-muted-foreground">{a.instructor}</span>
        </div>

        <Button size="sm" className="w-full text-xs gap-1.5" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Modifier cette fiche
        </Button>
      </div>
    </div>
  );
}
