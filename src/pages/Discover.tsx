import { useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2, Megaphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ActivityFilterBar, { type FilterCategory, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";
import ActivitiesView from "@/components/ActivitiesView";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { get: getSetting, ready: settingsReady } = useSiteSettings();

  const initialFilter = searchParams.get("filter") as FilterCategory | null;

  const [filter, setFilter] = useState<FilterCategory>(
    initialFilter && CATEGORY_FILTERS.some(f => f.value === initialFilter) ? initialFilter : "all"
  );
  const [subFilter, setSubFilter] = useState<string>("all");

  const { courses, schedules, workshops, loading, getInstructorPhoto } = useActivitiesData();

  const featuredEventTitle = settingsReady ? getSetting("featured_event_title", "") : "";
  const featuredEventLink = settingsReady ? getSetting("featured_event_link", "") : "";
  const hasFeaturedEvent = !!featuredEventTitle;

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
  }, [setSearchParams]);

  const handleSubFilterChange = useCallback((value: string) => {
    setSubFilter(value);
  }, []);

  const handleSwitchToReserver = useCallback((params?: { filter?: FilterCategory; activity?: string; date?: string; linkedGroup?: string | null }) => {
    const urlParams = new URLSearchParams();
    if (params?.activity) urlParams.set("activity", params.activity);
    if (params?.date) urlParams.set("date", params.date);
    if (params?.linkedGroup) urlParams.set("linkedGroup", params.linkedGroup);
    window.location.href = `/reserver?${urlParams.toString()}`;
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
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

        <div className="bg-secondary/30 py-3 text-center">
          <p className="text-sm md:text-base font-display font-bold text-primary-dark">Yoga, Pilates, Poterie & Bien-être</p>
        </div>

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
            getInstructorPhoto={getInstructorPhoto}
            onSwitchToPlanning={handleSwitchToReserver}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
