import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/pages/Discover";

export type FilterCategory = "all" | "yoga" | "poterie" | "bien-etre";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string; activeBg?: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "yoga", label: "Yoga & Pilates", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
  { value: "bien-etre", label: "Ateliers", dot: "bg-[hsl(0,55%,58%)]", activeBg: "bg-[hsl(0,55%,58%)]" },
];

export const CATEGORY_STYLES: Record<string, { block: string; dot: string; text: string; bookBtn: string }> = {
  yoga: {
    block: "bg-[hsl(210,60%,55%)]/10 border-[hsl(210,60%,55%)]/30 text-[hsl(210,60%,35%)]",
    dot: "bg-[hsl(210,60%,55%)]",
    text: "text-[hsl(210,60%,40%)]",
    bookBtn: "bg-[hsl(210,60%,55%)] hover:bg-[hsl(210,60%,45%)] text-white",
  },
  poterie: {
    block: "bg-[hsl(40,76%,60%)]/10 border-[hsl(40,76%,60%)]/30 text-[hsl(40,76%,35%)]",
    dot: "bg-[hsl(40,76%,60%)]",
    text: "text-[hsl(40,76%,35%)]",
    bookBtn: "bg-[hsl(40,76%,60%)] hover:bg-[hsl(40,76%,50%)] text-white",
  },
  "bien-etre": {
    block: "bg-[hsl(0,55%,58%)]/10 border-[hsl(0,55%,58%)]/30 text-[hsl(0,55%,38%)]",
    dot: "bg-[hsl(0,55%,58%)]",
    text: "text-[hsl(0,55%,38%)]",
    bookBtn: "bg-[hsl(0,55%,58%)] hover:bg-[hsl(0,55%,48%)] text-white",
  },
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
  subFilterOptions?: string[];
  subFilter?: string;
  onSubFilterChange?: (value: string) => void;
}

export default function ActivityFilterBar({ filter, onFilterChange, view, onViewChange, subFilterOptions, subFilter, onSubFilterChange }: ActivityFilterBarProps) {
  const catFilter = CATEGORY_FILTERS.find(f => f.value === filter);
  const activeBg = catFilter?.activeBg || "bg-primary-dark";

  return (
    <div className="sticky top-16 z-30">
      {/* View tabs */}
      <div className="bg-emerald-50/60 backdrop-blur border-b">
        <div className="container">
          <div className="flex items-center justify-center gap-1.5 pt-1.5 pb-1">
            {VIEW_TABS.map(tab => (
              <Button
                key={tab.value}
                size="sm"
                onClick={() => onViewChange(tab.value)}
                className={`rounded-md px-3 text-xs h-8 font-semibold transition-colors ${
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

        {/* Category pills */}
        <div className="container pb-1.5 pt-0.5">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {CATEGORY_FILTERS.map(f => {
              const isActive = filter === f.value;
              return (
                <Button
                  key={f.value}
                  variant={isActive ? null as any : "outline"}
                  size="sm"
                  onClick={() => onFilterChange(f.value)}
                  className={`rounded-full gap-1 h-7 text-xs px-2.5 ${
                    isActive
                      ? f.activeBg
                        ? `${f.activeBg} text-white border-transparent hover:text-white hover:opacity-90`
                        : "bg-primary-dark text-white border-transparent hover:text-white hover:bg-primary-dark/90"
                      : ""
                  }`}
                >
                  {f.dot && <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : f.dot}`} />}
                  {f.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-filters (if provided) */}
      {subFilterOptions && subFilterOptions.length > 1 && onSubFilterChange && (
        <div className="bg-emerald-50/40 backdrop-blur border-b">
          <div className="container py-1.5">
            <div className="flex flex-wrap items-center gap-1.5 justify-center">
              <Button
                variant={subFilter === "all" ? null as any : "outline"}
                size="sm"
                className={`rounded-full h-6 text-[11px] px-3 italic ${subFilter === "all" ? `${activeBg} text-white border-transparent hover:text-white hover:opacity-90` : ""}`}
                onClick={() => onSubFilterChange("all")}
              >
                Tout voir
              </Button>
              {subFilterOptions.map(name => (
                <Button
                  key={name}
                  variant={subFilter === name ? null as any : "outline"}
                  size="sm"
                  className={`rounded-full h-6 text-[11px] px-3 italic ${subFilter === name ? `${activeBg} text-white border-transparent hover:text-white hover:opacity-90` : ""}`}
                  onClick={() => onSubFilterChange(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
