import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Loader2, Megaphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ActivityFilterBar, { type FilterCategory, CATEGORY_FILTERS } from "@/components/ActivityFilterBar";
import ActivitiesView from "@/components/ActivitiesView";
import { useActivitiesData } from "@/hooks/useActivitiesData";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Discover() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { get: getSetting, ready: settingsReady } = useSiteSettings();

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  const handleSubFilterChange = useCallback((value: string) => {
    setSubFilter(value);
  }, []);

  const handleSwitchToReserver = useCallback((params?: { type: "course" | "workshop"; id: string; date?: string }) => {
    const urlParams = new URLSearchParams();
    if (params?.type) urlParams.set("type", params.type);
    if (params?.id) urlParams.set("id", params.id);
    if (params?.date) urlParams.set("date", params.date);
    navigate(`/reserver?${urlParams.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

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
          <p className="text-sm md:text-base font-display font-bold text-primary-dark">Yoga, Pilates & Poterie</p>
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
            subFilter={subFilter}
            getInstructorPhoto={getInstructorPhoto}
            onSwitchToPlanning={handleSwitchToReserver}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}
