import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/pages/Discover";

export type FilterCategory = "all" | "yoga" | "poterie" | "bien-etre";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string; activeBg?: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "yoga", label: "Yoga & Pilates", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
  { value: "bien-etre", label: "Ateliers", dot: "bg-[hsl(0,55%,58%)]", activeBg: "bg-[hsl(0,55%,58%)]" },
];

export const CATEGORY_STYLES: Record<string, { block: string; dot: string }> = {
  yoga: { block: "bg-[hsl(210,60%,55%)]/10 border-[hsl(210,60%,55%)]/30 text-[hsl(210,60%,35%)]", dot: "bg-[hsl(210,60%,55%)]" },
  poterie: { block: "bg-[hsl(40,76%,60%)]/10 border-[hsl(40,76%,60%)]/30 text-[hsl(40,76%,35%)]", dot: "bg-[hsl(40,76%,60%)]" },
  "bien-etre": { block: "bg-[hsl(0,55%,58%)]/10 border-[hsl(0,55%,58%)]/30 text-[hsl(0,55%,38%)]", dot: "bg-[hsl(0,55%,58%)]" },
};

const VIEW_TABS: { label: string; value: ViewMode }[] = [
  { label: "Les activités", value: "activites" },
  { label: "Planning & réservation", value: "planning" },
];

interface ActivityFilterBarProps {
  filter: FilterCategory;
  onFilterChange: (value: FilterCategory) => void;
  view: ViewMode;
  onViewChange: (value: ViewMode) => void;
}

export default function ActivityFilterBar({ filter, onFilterChange, view, onViewChange }: ActivityFilterBarProps) {
  return (
    <div className="sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      {/* View tabs — compact */}
      <div className="container">
        <div className="flex items-center justify-center gap-1.5 pt-1.5 pb-1">
          {VIEW_TABS.map(tab => (
            <Button
              key={tab.value}
              size="sm"
              onClick={() => onViewChange(tab.value)}
              className={`rounded-full px-3 text-xs h-8 font-semibold transition-colors ${
                view === tab.value
                  ? "bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90"
                  : "bg-primary/15 text-primary-dark hover:bg-primary/25"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Category pills — compact, no label */}
      <div className="container pb-1.5 pt-0.5">
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {CATEGORY_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(f.value)}
              className="rounded-full gap-1 h-6 text-[11px] px-2"
            >
              {f.dot && <div className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />}
              {f.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
