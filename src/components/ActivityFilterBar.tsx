import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import filterYoga from "@/assets/filter-yoga.png";
import filterPoterie from "@/assets/filter-poterie.png";
import filterAteliers from "@/assets/filter-ateliers.png";
import filterTout from "@/assets/filter-tout.png";

export type FilterCategory = "all" | "yoga" | "poterie" | "bien-etre";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string; activeBg?: string; inactiveBg?: string; icon?: string; iconSettingKey?: string }[] = [
  { value: "all", label: "Tout", icon: filterTout, iconSettingKey: "filter_icon_tout" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]", inactiveBg: "bg-[hsl(210,60%,90%)] text-[hsl(210,60%,35%)]", icon: filterYoga, iconSettingKey: "filter_icon_yoga" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]", inactiveBg: "bg-[hsl(40,76%,90%)] text-[hsl(40,76%,30%)]", icon: filterPoterie, iconSettingKey: "filter_icon_poterie" },
  { value: "bien-etre", label: "Atelier", dot: "bg-[hsl(0,55%,58%)]", activeBg: "bg-[hsl(0,55%,58%)]", inactiveBg: "bg-[hsl(0,55%,90%)] text-[hsl(0,55%,35%)]", icon: filterAteliers, iconSettingKey: "filter_icon_bien_etre" },
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

interface ActivityFilterBarProps {
  filter: FilterCategory;
  onFilterChange: (value: FilterCategory) => void;
  subFilterOptions?: string[];
  subFilter?: string;
  onSubFilterChange?: (value: string) => void;
}

export default function ActivityFilterBar({ filter, onFilterChange, subFilterOptions, subFilter, onSubFilterChange }: ActivityFilterBarProps) {
  const navigate = useNavigate();
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const { get: getSetting } = useSiteSettings();
  const catFilter = CATEGORY_FILTERS.find(f => f.value === filter);
  const activeBg = catFilter?.activeBg || "bg-primary-dark";
  const hasSubFilters = filter !== "all" && subFilterOptions && subFilterOptions.length > 0;

  const getIcon = (f: typeof CATEGORY_FILTERS[0]) => {
    if (f.iconSettingKey) {
      const customUrl = getSetting(f.iconSettingKey, "");
      if (customUrl) return customUrl;
    }
    return f.icon || "";
  };

  return (
    <div className="sticky top-16 z-30">
      <div className="bg-emerald-50/60 backdrop-blur border-b">
        <div className="container pb-1.5 pt-1.5">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {CATEGORY_FILTERS.map(f => {
              const isActive = filter === f.value;
              return (
                <Button
                  key={f.value}
                  variant={isActive ? null as any : "outline"}
                  size="sm"
                  onClick={() => onFilterChange(f.value)}
                  className={`rounded-full flex-col h-auto py-1 px-3 gap-0.5 text-xs min-w-[4.5rem] ${
                    isActive
                      ? f.activeBg
                        ? `${f.activeBg} text-white border-transparent hover:text-white hover:opacity-90`
                        : "bg-primary-dark text-white border-transparent hover:text-white hover:bg-primary-dark/90"
                      : f.inactiveBg
                        ? `${f.inactiveBg} border-transparent`
                        : ""
                  }`}
                >
                  <img src={getIcon(f)} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <span className="leading-tight">{f.label}</span>
                </Button>
              );
            })}
            {hasSubFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
                className={`rounded-full h-7 w-7 p-0 ${moreFiltersOpen ? "bg-muted" : ""}`}
                title="Plus de filtres"
              >
                {moreFiltersOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasSubFilters && moreFiltersOpen && onSubFilterChange && (
        <div className="bg-emerald-50/40 backdrop-blur border-b">
          <div className="container py-2">
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
