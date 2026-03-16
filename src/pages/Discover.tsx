import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ActivityFilterBar, { type FilterCategory, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";
import ActivitiesView from "@/components/ActivitiesView";
import PlanningView from "@/components/PlanningView";
import PlanningTypeView from "@/components/PlanningTypeView";
import { useActivitiesData } from "@/hooks/useActivitiesData";

export type ViewMode = "activites" | "planning" | "planning-type";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = searchParams.get("view") === "planning" ? "planning" : searchParams.get("view") === "planning-type" ? "planning-type" : "activites";
  const initialFilter = searchParams.get("filter") as FilterCategory | null;
  const initialActivity = searchParams.get("activity");
  const initialDate = searchParams.get("date");

  const [view, setView] = useState<ViewMode>(initialView);
  const [filter, setFilter] = useState<FilterCategory>(
    initialFilter && CATEGORY_FILTERS.some(f => f.value === initialFilter) ? initialFilter : "all"
  );
  const [planningActivity, setPlanningActivity] = useState<string | null>(initialActivity);
  const [planningDate, setPlanningDate] = useState<string | null>(initialDate);
  const [subFilter, setSubFilter] = useState<string>("all");

  const { courses, schedules, workshops, loading, getInstructorPhoto } = useActivitiesData();

  // Compute sub-filter options based on current category filter
  const subFilterOptions = useMemo(() => {
    if (filter === "all") return [];
    const names = new Set<string>();
    courses.filter(c => c.category === filter).forEach(c => names.add(c.name));
    workshops.filter(w => w.category === filter).forEach(w => names.add(w.name));
    return Array.from(names).sort();
  }, [filter, courses, workshops]);

  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v);
    const params = new URLSearchParams();
    if (v === "planning") params.set("view", "planning");
    if (filter !== "all") params.set("filter", filter);
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filter, setSearchParams]);

  const handleFilterChange = useCallback((f: FilterCategory) => {
    setFilter(f);
    setSubFilter("all");
    setPlanningActivity(null);
    setPlanningDate(null);
    const params = new URLSearchParams();
    if (view === "planning") params.set("view", "planning");
    if (f !== "all") params.set("filter", f);
    setSearchParams(params, { replace: true });
  }, [view, setSearchParams]);

  const handleSubFilterChange = useCallback((value: string) => {
    setSubFilter(value);
    if (value !== "all") {
      setPlanningActivity(value);
    } else {
      setPlanningActivity(null);
    }
  }, []);

  const handleSwitchToPlanning = useCallback((params?: { filter?: FilterCategory; activity?: string; date?: string }) => {
    if (params?.filter) setFilter(params.filter);
    if (params?.activity) {
      setPlanningActivity(params.activity);
      setSubFilter(params.activity);
    }
    if (params?.date) setPlanningDate(params.date);
    setView("planning");

    const urlParams = new URLSearchParams();
    urlParams.set("view", "planning");
    if (params?.filter) urlParams.set("filter", params.filter);
    if (params?.activity) urlParams.set("activity", params.activity);
    if (params?.date) urlParams.set("date", params.date);
    setSearchParams(urlParams, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Minimal tagline */}
        <div className="bg-secondary/30 py-3 text-center">
          <p className="text-sm text-muted-foreground">Yoga, Pilates, Poterie & Bien-être</p>
        </div>

        {/* Navigation + Filters */}
        <ActivityFilterBar
          filter={filter}
          onFilterChange={handleFilterChange}
          view={view}
          onViewChange={handleViewChange}
          subFilterOptions={subFilterOptions}
          subFilter={subFilter}
          onSubFilterChange={handleSubFilterChange}
        />

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : view === "activites" ? (
          <ActivitiesView
            courses={courses}
            workshops={workshops}
            schedules={schedules}
            filter={filter}
            getInstructorPhoto={getInstructorPhoto}
            onSwitchToPlanning={handleSwitchToPlanning}
          />
        ) : (
          <PlanningView
            courses={courses}
            schedules={schedules}
            workshops={workshops}
            filter={filter}
            initialActivity={planningActivity}
            initialDate={planningDate}
            subFilter={subFilter}
            onSubFilterChange={handleSubFilterChange}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
