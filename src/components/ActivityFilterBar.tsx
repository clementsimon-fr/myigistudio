import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FilterCategory = "all" | "yoga" | "poterie";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string; activeBg?: string }[] = [
  { value: "all", label: "Tout" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
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
  const [overrides, setOverrides] = useState<Record<string, HomeButtonRow>>({});

  useEffect(() => {
    supabase.from("home_buttons").select("key, title, icon_url").then(({ data }) => {
      if (!data) return;
      const map: Record<string, HomeButtonRow> = {};
      (data as any[]).forEach((r) => (map[r.key] = r));
      setOverrides(map);
    });
  }, []);

  const getLabel = (key: string, fallback: string) => overrides[key]?.title || fallback;

  return (
    <div className="sticky top-16 z-30">
      <div className="bg-background/95 backdrop-blur border-b">
        <div className="container py-2.5 flex items-center justify-center gap-1.5">
          {VISIBLE_FILTERS.map(f => {
            const isActive = filter === f.value;
            const label = getLabel(f.value, f.label);
            return (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={`rounded-full px-4 h-9 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? f.activeBg
                      ? `${f.activeBg} text-white`
                      : "bg-primary-dark text-primary-dark-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : f.dot}`} />}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
