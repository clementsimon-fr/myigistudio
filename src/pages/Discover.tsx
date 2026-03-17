import { useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Megaphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ActivityFilterBar, { type FilterCategory, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";
import ActivitiesView from "@/components/ActivitiesView";
import PlanningView from "@/components/PlanningView";
import PlanningTypeView from "@/components/PlanningTypeView";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export type ViewMode = "activites" | "planning";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { get: getSetting, ready: settingsReady } = useSiteSettings();

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

  // Site settings for hero and featured event
  const heroWelcome = settingsReady ? getSetting("hero_welcome", "") : "";
  const heroTitle = settingsReady ? getSetting("hero_title", "") : "";
  const heroSubtitle = settingsReady ? getSetting("hero_subtitle", "") : "";
  const featuredEventTitle = settingsReady ? getSetting("featured_event_title", "") : "";
  const featuredEventLink = settingsReady ? getSetting("featured_event_link", "") : "";

  const hasCustomHero = !!(heroWelcome || heroTitle || heroSubtitle);
  const hasFeaturedEvent = !!featuredEventTitle;

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
        {/* Featured event banner */}
        {hasFeaturedEvent && (
          <Link
            to={featuredEventLink || "/"}
            className="block bg-[hsl(0,55%,58%)] text-white text-center py-2.5 px-4 text-sm font-medium hover:bg-[hsl(0,55%,50%)] transition-colors"
          >
            <div className="container flex items-center justify-center gap-2">
              <Megaphone className="h-4 w-4" />
              <span>{featuredEventTitle}</span>
              <span className="text-white/70">— Cliquez ici pour en savoir plus</span>
            </div>
          </Link>
        )}

        {/* Hero section or minimal tagline */}
        {hasCustomHero ? (
          <div className="bg-secondary/30 py-8 text-center">
            <div className="container max-w-2xl space-y-2">
              {heroWelcome && <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{heroWelcome}</p>}
              {heroTitle && <h1 className="text-2xl md:text-4xl font-display font-bold text-primary-dark">{heroTitle}</h1>}
              {heroSubtitle && <p className="text-sm text-muted-foreground whitespace-pre-line">{heroSubtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="bg-secondary/30 py-3 text-center">
            <p className="text-sm text-muted-foreground">Yoga, Pilates, Poterie & Bien-être</p>
          </div>
        )}

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
        ) : view === "planning-type" ? (
          <PlanningTypeView
            courses={courses}
            workshops={workshops}
            schedules={schedules}
            filter={filter}
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
