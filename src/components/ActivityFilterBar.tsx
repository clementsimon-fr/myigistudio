import { Button } from "@/components/ui/button";

export type FilterCategory = "all" | "yoga" | "poterie" | "bien-etre";

export const CATEGORY_FILTERS: { value: FilterCategory; label: string; dot?: string }[] = [
  { value: "all", label: "Toutes les activités" },
  { value: "yoga", label: "Yoga & Pilates", dot: "bg-[hsl(148,18%,56%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]" },
  { value: "bien-etre", label: "Bien-être", dot: "bg-[hsl(18,68%,54%)]" },
];

export const CATEGORY_STYLES: Record<string, { block: string; dot: string }> = {
  yoga: { block: "bg-primary/10 border-primary/30 text-primary-dark", dot: "bg-[hsl(148,18%,56%)]" },
  poterie: { block: "bg-accent/15 border-accent/35 text-accent-foreground", dot: "bg-[hsl(40,76%,60%)]" },
  "bien-etre": { block: "bg-secondary/20 border-secondary/40 text-secondary-foreground", dot: "bg-[hsl(18,68%,54%)]" },
};

interface ActivityFilterBarProps {
  filter: FilterCategory;
  onFilterChange: (value: FilterCategory) => void;
  extraContent?: React.ReactNode;
}

export default function ActivityFilterBar({ filter, onFilterChange, extraContent }: ActivityFilterBarProps) {
  return (
    <div className="py-3 border-b sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORY_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => onFilterChange(f.value)}
              className="rounded-full gap-1.5"
            >
              {f.dot && <div className={`w-2.5 h-2.5 rounded-full ${f.dot}`} />}
              {f.label}
            </Button>
          ))}
          {extraContent}
        </div>
      </div>
    </div>
  );
}
