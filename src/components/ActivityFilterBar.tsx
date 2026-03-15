import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/pages/Discover";

export type FilterCategory = "all" | "yoga" | "poterie" | "bien-etre";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "yoga", label: "Yoga & Pilates", dot: "bg-[hsl(148,18%,56%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]" },
  { value: "bien-etre", label: "Ateliers", dot: "bg-[hsl(18,68%,54%)]" },
];

export const CATEGORY_STYLES: Record<string, { block: string; dot: string }> = {
  yoga: { block: "bg-primary/10 border-primary/30 text-primary-dark", dot: "bg-[hsl(148,18%,56%)]" },
  poterie: { block: "bg-accent/15 border-accent/35 text-accent-foreground", dot: "bg-[hsl(40,76%,60%)]" },
  "bien-etre": { block: "bg-secondary/20 border-secondary/40 text-secondary-foreground", dot: "bg-[hsl(18,68%,54%)]" },
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
      {/* View tabs — always visible */}
      <div className="container">
        <div className="flex items-center justify-center gap-2 pt-2 pb-1">
          {VIEW_TABS.map(tab => (
            <Button
              key={tab.value}
              size="sm"
              onClick={() => onViewChange(tab.value)}
              className={`rounded-full px-5 text-sm font-semibold transition-colors ${
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

      {/* Category filters */}
      <div className="container pb-2 pt-1">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">Filtre</span>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {CATEGORY_FILTERS.map(f => (
              <Button
                key={f.value}
                variant={filter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => onFilterChange(f.value)}
                className="rounded-full gap-1.5 h-7 text-xs"
              >
                {f.dot && <div className={`w-2 h-2 rounded-full ${f.dot}`} />}
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
