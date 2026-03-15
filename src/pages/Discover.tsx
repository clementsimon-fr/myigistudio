import { useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ActivityFilterBar, { type FilterCategory, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";
import ActivitiesView from "@/components/ActivitiesView";
import PlanningView from "@/components/PlanningView";
import { useActivitiesData } from "@/hooks/useActivitiesData";

export type ViewMode = "activites" | "planning";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = searchParams.get("view") === "planning" ? "planning" : "activites";
  const initialFilter = searchParams.get("filter") as FilterCategory | null;
  const initialActivity = searchParams.get("activity");
  const initialDate = searchParams.get("date");

  const [view, setView] = useState<ViewMode>(initialView);
  const [filter, setFilter] = useState<FilterCategory>(
    initialFilter && CATEGORY_FILTERS.some(f => f.value === initialFilter) ? initialFilter : "all"
  );
  // Track activity/date for planning auto-scroll
  const [planningActivity, setPlanningActivity] = useState<string | null>(initialActivity);
  const [planningDate, setPlanningDate] = useState<string | null>(initialDate);

  const { courses, schedules, workshops, loading, getInstructorPhoto } = useActivitiesData();

  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v);
    // Update URL without navigation
    const params = new URLSearchParams();
    if (v === "planning") params.set("view", "planning");
    if (filter !== "all") params.set("filter", filter);
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [filter, setSearchParams]);

  const handleFilterChange = useCallback((f: FilterCategory) => {
    setFilter(f);
    setPlanningActivity(null);
    setPlanningDate(null);
    const params = new URLSearchParams();
    if (view === "planning") params.set("view", "planning");
    if (f !== "all") params.set("filter", f);
    setSearchParams(params, { replace: true });
  }, [view, setSearchParams]);

  const handleSwitchToPlanning = useCallback((params?: { filter?: FilterCategory; activity?: string; date?: string }) => {
    if (params?.filter) setFilter(params.filter);
    if (params?.activity) setPlanningActivity(params.activity);
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
        {/* ─── Hero (mobile only) ─── */}
        <section className="relative overflow-hidden bg-secondary/30 py-12 md:hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center">
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-sm font-medium uppercase tracking-widest text-primary-dark mb-3">Bienvenue chez</motion.p>
              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-4xl font-display font-bold text-primary-dark mb-3">
                MyIgi<span className="text-primary italic">Studio</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-base text-muted-foreground leading-relaxed px-4">
                Yoga, Pilates, Poterie & Bien-être.<br />Réservez vos cours et ateliers en quelques clics.
              </motion.p>
            </div>
          </div>
        </section>

        {/* ─── Sticky filters with view toggle ─── */}
        <ActivityFilterBar
          filter={filter}
          onFilterChange={handleFilterChange}
          view={view}
          onViewChange={handleViewChange}
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
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
