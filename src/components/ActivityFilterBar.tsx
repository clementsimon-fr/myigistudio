import { useSiteSettings } from "@/hooks/useSiteSettings";
import filterYoga from "@/assets/filter-yoga.png";
import filterPoterie from "@/assets/filter-poterie.png";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import filterYoga from "@/assets/filter-yoga.png";
import filterPoterie from "@/assets/filter-poterie.png";
import filterTout from "@/assets/filter-tout.png";

export type FilterCategory = "all" | "yoga" | "poterie";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string; activeBg?: string; inactiveBg?: string; icon?: string; iconSettingKey?: string }[] = [
  { value: "all", label: "Tout", icon: filterTout, iconSettingKey: "filter_icon_tout" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]", inactiveBg: "bg-[hsl(210,60%,90%)] text-[hsl(210,60%,35%)]", icon: filterYoga, iconSettingKey: "filter_icon_yoga" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]", inactiveBg: "bg-[hsl(40,76%,90%)] text-[hsl(40,76%,30%)]", icon: filterPoterie, iconSettingKey: "filter_icon_poterie" },
];

// Filters visible to visitors (excludes "Tout")
const VISIBLE_FILTERS = CATEGORY_FILTERS.filter(f => f.value !== "all");

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
};

interface ActivityFilterBarProps {
  filter: FilterCategory;
  onFilterChange: (value: FilterCategory) => void;
  subFilterOptions?: string[];
  subFilter?: string;
  onSubFilterChange?: (value: string) => void;
}

export default function ActivityFilterBar({ filter, onFilterChange }: ActivityFilterBarProps) {
  const { get: getSetting } = useSiteSettings();

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
        <div className="container py-3">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {VISIBLE_FILTERS.map(f => {
              const isActive = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => onFilterChange(isActive ? "all" : f.value)}
                  className={`rounded-2xl flex items-center gap-3 px-6 py-3 min-w-[200px] transition-all border-2 ${
                    isActive
                      ? f.activeBg
                        ? `${f.activeBg} text-white border-transparent shadow-md`
                        : "bg-primary-dark text-white border-transparent shadow-md"
                      : "bg-white border-muted hover:border-muted-foreground/30 hover:shadow-sm"
                  }`}
                >
                  <img src={getIcon(f)} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  <div className="text-left">
                    <span className={`block font-semibold text-sm leading-tight ${isActive ? "text-white" : "text-foreground"}`}>
                      Voir les activités {f.label}
                    </span>
                    <span className={`block text-xs mt-0.5 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                      {f.value === "yoga" ? "Cours & planning" : "Ateliers & calendrier"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
