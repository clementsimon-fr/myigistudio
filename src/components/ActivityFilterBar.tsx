import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

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

const VIEW_TABS = [
  { label: "Activités", to: "/" },
  { label: "Planning", to: "/calendrier" },
];

interface ActivityFilterBarProps {
  filter: FilterCategory;
  onFilterChange: (value: FilterCategory) => void;
}

export default function ActivityFilterBar({ filter, onFilterChange }: ActivityFilterBarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const handleFilterChange = (value: FilterCategory) => {
    onFilterChange(value);
    // Scroll to top of content when changing filter
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="sticky top-16 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      {/* Level 1: View tabs */}
      <div className="container">
        <div className="flex items-center justify-center gap-2 pt-2 pb-1">
          {VIEW_TABS.map(tab => {
            const isActive = tab.to === "/" ? (currentPath === "/" || currentPath === "/activites") : currentPath === tab.to;
            return (
              <Link key={tab.to} to={tab.to + (filter !== "all" ? `?filter=${filter}` : "")}>
                <Button
                  size="sm"
                  className={`rounded-full px-5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90"
                      : "bg-primary/15 text-primary-dark hover:bg-primary/25"
                  }`}
                >
                  {tab.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Level 2: Category filters */}
      <div className="container pb-2 pt-1">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {CATEGORY_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange(f.value)}
              className="rounded-full gap-1.5 h-7 text-xs"
            >
              {f.dot && <div className={`w-2 h-2 rounded-full ${f.dot}`} />}
              {f.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
