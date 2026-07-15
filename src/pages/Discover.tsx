import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ActivityFilterBar, { type FilterCategory, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";
import ActivitiesView from "@/components/ActivitiesView";
import { useActivitiesData } from "@/hooks/useActivitiesData";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilter = searchParams.get("filter") as FilterCategory | null;

  const [filter, setFilter] = useState<FilterCategory>(
    initialFilter && CATEGORY_FILTERS.some(f => f.value === initialFilter) ? initialFilter : "yoga"
  );
  const [subFilter, setSubFilter] = useState<string>("all");
  const planningScrolled = useRef(false);

  const { courses, schedules, workshops, loading, getInstructorPhoto } = useActivitiesData();

  // Handle ?view=planning: scroll to first planning section once loaded
  useEffect(() => {
    if (searchParams.get("view") === "planning" && !loading && !planningScrolled.current) {
      planningScrolled.current = true;
      setTimeout(() => {
        const el = document.querySelector("[data-planning-section]");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [searchParams, loading]);

  const subFilterOptions = useMemo(() => {
    if (filter === "all") return [];
    const names = new Set<string>();
    courses.filter(c => c.category === filter).forEach(c => names.add(c.name));
    workshops.filter(w => w.category === filter).forEach(w => names.add(w.name));
    return Array.from(names).sort();
  }, [filter, courses, workshops]);

  const handleFilterChange = useCallback((f: FilterCategory) => {
    setFilter(f);
    setSubFilter("all");
    const params = new URLSearchParams();
    if (f !== "all") params.set("filter", f);
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  const handleSubFilterChange = useCallback((value: string) => {
    setSubFilter(value);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ActivityFilterBar
          filter={filter}
          onFilterChange={handleFilterChange}
          subFilterOptions={subFilterOptions}
          subFilter={subFilter}
          onSubFilterChange={handleSubFilterChange}
        />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ActivitiesView
            courses={courses}
            workshops={workshops}
            schedules={schedules}
            filter={filter}
            subFilter={subFilter}
            getInstructorPhoto={getInstructorPhoto}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
