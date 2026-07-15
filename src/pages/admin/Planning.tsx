import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";
import DailyView from "@/components/admin/DailyView";
import MonthlyView from "@/components/admin/MonthlyView";

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes", dot: "", activeBg: "" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
];

export default function AdminPlanning() {
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [categoryFilter, setCategoryFilter] = useState("all");

  return (
    <AdminLayout title="Mon agenda">
      {/* Views & Filters bar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={viewMode === "daily" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode("daily")}
          >
            <CalendarDays className="h-4 w-4" /> Aujourd'hui
          </Button>
          <Button
            variant={viewMode === "weekly" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode("weekly")}
          >
            <CalendarRange className="h-4 w-4" /> Cette semaine
          </Button>
          <Button
            variant={viewMode === "monthly" ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode("monthly")}
          >
            <Calendar className="h-4 w-4" /> Ce mois
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map(f => {
            const isActive = categoryFilter === f.value;
            return (
              <Badge
                key={f.value}
                variant={isActive ? "default" : "outline"}
                className={`cursor-pointer text-xs gap-1 ${isActive && f.activeBg ? `${f.activeBg} text-white border-transparent hover:opacity-90` : ""}`}
                onClick={() => setCategoryFilter(f.value)}
              >
                {f.dot && <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white/80" : f.dot}`} />}
                {f.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {viewMode === "monthly" ? (
        <MonthlyView categoryFilter={categoryFilter} />
      ) : (
        <DailyView categoryFilter={categoryFilter} viewMode={viewMode} />
      )}
    </AdminLayout>
  );
}
