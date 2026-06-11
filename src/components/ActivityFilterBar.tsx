import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import StoryPanel from "@/components/StoryPanel";
import filterYoga from "@/assets/filter-yoga.png";
import filterPoterie from "@/assets/filter-poterie.png";
import filterTout from "@/assets/filter-tout.png";

export type FilterCategory = "all" | "yoga" | "poterie";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string; activeBg?: string; inactiveBg?: string; icon?: string; iconSettingKey?: string; ringColor?: string }[] = [
  { value: "all", label: "Tout", icon: filterTout, iconSettingKey: "filter_icon_tout" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]", inactiveBg: "bg-[hsl(210,60%,90%)] text-[hsl(210,60%,35%)]", icon: filterYoga, iconSettingKey: "filter_icon_yoga", ringColor: "ring-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]", inactiveBg: "bg-[hsl(40,76%,90%)] text-[hsl(40,76%,30%)]", icon: filterPoterie, iconSettingKey: "filter_icon_poterie", ringColor: "ring-[hsl(40,76%,60%)]" },
];

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

interface HomeButtonRow {
  key: string;
  title: string;
  icon_url: string | null;
}

export default function ActivityFilterBar({ filter, onFilterChange }: ActivityFilterBarProps) {
  const { get: getSetting } = useSiteSettings();
  const [storyOpen, setStoryOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, HomeButtonRow>>({});

  useEffect(() => {
    supabase.from("home_buttons").select("key, title, icon_url").then(({ data }) => {
      if (!data) return;
      const map: Record<string, HomeButtonRow> = {};
      (data as any[]).forEach((r) => (map[r.key] = r));
      setOverrides(map);
    });
  }, []);

  const getIcon = (f: typeof CATEGORY_FILTERS[0]) => {
    const ov = overrides[f.value]?.icon_url;
    if (ov) return ov;
    if (f.iconSettingKey) {
      const customUrl = getSetting(f.iconSettingKey, "");
      if (customUrl) return customUrl;
    }
    return f.icon || "";
  };

  const getLabel = (key: string, fallback: string) => overrides[key]?.title || fallback;
  const storyLabel = getLabel("decouvrir", "Histoire");
  const storyIcon = overrides["decouvrir"]?.icon_url;

  return (
    <>
      <div className="sticky top-16 z-30">
        <div className="bg-emerald-50/60 backdrop-blur border-b">
          <div className="container py-3 md:py-4">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              {VISIBLE_FILTERS.map(f => {
                const isActive = filter === f.value;
                const label = getLabel(f.value, f.label);
                return (
                  <button
                    key={f.value}
                    onClick={() => onFilterChange(isActive ? "all" : f.value)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden flex items-center justify-center bg-white transition-all ring-2 ring-offset-2 ring-offset-emerald-50 ${
                        isActive ? `${f.ringColor} shadow-md scale-105` : "ring-transparent hover:ring-muted-foreground/20"
                      }`}
                    >
                      <img src={getIcon(f)} alt={label} className="w-full h-full object-cover" />
                    </div>
                    <span className={`text-xs md:text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setStoryOpen(true)}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-accent/30 to-primary/20 ring-2 ring-offset-2 ring-offset-emerald-50 ring-transparent hover:ring-accent transition-all hover:scale-105">
                  {storyIcon ? (
                    <img src={storyIcon} alt={storyLabel} className="w-full h-full object-cover" />
                  ) : (
                    <Star className="h-7 w-7 md:h-8 md:w-8 text-accent-foreground fill-accent" />
                  )}
                </div>
                <span className="text-xs md:text-sm font-medium text-muted-foreground">{storyLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <StoryPanel open={storyOpen} onClose={() => setStoryOpen(false)} />
    </>
  );
}
