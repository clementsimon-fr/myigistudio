import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import MonthlyView from "@/components/admin/MonthlyView";

const CATEGORY_FILTERS = [
  { value: "all", label: "Toutes", dot: "", activeBg: "" },
  { value: "yoga", label: "Yoga", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
];

export default function AdminPlanning() {
  const [categoryFilter, setCategoryFilter] = useState("all");

  return (
    <AdminLayout title="Mon agenda">
      <div className="flex gap-1.5 flex-wrap mb-6">
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

      <MonthlyView categoryFilter={categoryFilter} />
    </AdminLayout>
  );
}
