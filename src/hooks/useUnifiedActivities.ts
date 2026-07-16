import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Schedule, WorkshopEvent, UnifiedActivity } from "@/components/admin/activites/types";

export function useUnifiedActivities() {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [instructorsList, setInstructorsList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [coursesRes, workshopsRes, schedulesRes, instrRes] = await Promise.all([
      supabase.from("courses").select("*"),
      supabase.from("workshops").select("*").order("date"),
      supabase.from("course_schedules").select("*"),
      supabase.from("instructors").select("id, name").eq("active", true).order("name"),
    ]);

    const schedulesMap: Record<string, Schedule[]> = {};
    if (schedulesRes.data) {
      for (const s of schedulesRes.data as any[]) {
        if (!schedulesMap[s.course_id]) schedulesMap[s.course_id] = [];
        schedulesMap[s.course_id].push({
          id: s.id, day: s.day, time: s.time, end_time: s.end_time, spots: s.spots, spots_left: s.spots_left,
          price: s.price, inclusions: s.inclusions || "", card_yoga_count: s.card_yoga_count || 0,
        });
      }
    }

    const activitiesByName = new Map<string, UnifiedActivity>();
    if (coursesRes.data) {
      const groupedCourses: Record<string, any[]> = {};
      for (const c of coursesRes.data as any[]) {
        if (!groupedCourses[c.name]) groupedCourses[c.name] = [];
        groupedCourses[c.name].push(c);
      }
      for (const [name, group] of Object.entries(groupedCourses)) {
        const primary = group[0];
        const mergedSchedules = new Map<string, Schedule>();
        for (const course of group) {
          for (const schedule of schedulesMap[course.id] || []) {
            const key = `${schedule.day}-${schedule.time}-${schedule.end_time}`;
            if (!mergedSchedules.has(key)) mergedSchedules.set(key, schedule);
          }
        }
        activitiesByName.set(name, {
          id: primary.id, name: primary.name, description: primary.description || "", long_description: primary.long_description || "",
          category: primary.category, image: primary.image || "", images: primary.images || [], instructor: primary.instructor, instructor_id: primary.instructor_id,
          reminder_template: primary.reminder_template || "", modalities: primary.modalities || "", source: "course", courseIds: group.map(course => course.id),
          frequency: primary.frequency, spots: primary.spots, spots_left: primary.spots_left,
          schedules: [...mergedSchedules.values()],
          intensity: primary.intensity || "none", reminder_timing: primary.reminder_timing || "1j", workshopEvents: [],
          complementary_info: primary.complementary_info || "",
          price: primary.price || 0, tariff_mode: primary.tariff_mode || "cours",
        });
      }
    }
    if (workshopsRes.data) {
      const wsGrouped: Record<string, any[]> = {};
      for (const w of workshopsRes.data as any[]) {
        if (!wsGrouped[w.name]) wsGrouped[w.name] = [];
        wsGrouped[w.name].push(w);
      }
      for (const [, group] of Object.entries(wsGrouped)) {
        const uniqueWorkshops = new Map<string, any>();
        for (const w of group) {
          const key = w.linked_group
            ? `group:${w.linked_group}:${w.date || ""}`
            : `single:${w.name || ""}:${w.date || ""}:${w.time || ""}:${w.end_time || ""}`;
          if (!uniqueWorkshops.has(key)) {
            uniqueWorkshops.set(key, w);
          }
        }
        const dedupedGroup = [...uniqueWorkshops.values()].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        const first = dedupedGroup[0];
        const instrName = first.instructor_id && instrRes.data
          ? (instrRes.data as any[]).find(i => i.id === first.instructor_id)?.name || "Élodie" : "Élodie";
        const workshopEvents: WorkshopEvent[] = dedupedGroup.map(w => ({
          id: w.id, date: w.date, time: w.time, end_time: w.end_time, duration: w.duration,
          price: w.price, spots: w.spots, spots_left: w.spots_left,
          inclusions: w.inclusions || "", card_yoga_count: w.card_yoga_count || 0,
          linked_group: w.linked_group || null,
        }));
        const existing = activitiesByName.get(first.name);
        activitiesByName.set(first.name, {
          id: existing?.id || first.id,
          name: first.name,
          description: existing?.description || first.description || "",
          long_description: existing?.long_description || first.long_description || "",
          category: existing?.category || first.category,
          image: existing?.image || first.image || "",
          images: existing?.images?.length ? existing.images : (first.images || []),
          instructor: existing?.instructor || instrName,
          instructor_id: existing?.instructor_id ?? first.instructor_id,
          reminder_template: existing?.reminder_template || first.reminder_template || "",
          modalities: existing?.modalities || first.modalities || "",
          source: existing?.source || "workshop",
          courseIds: existing?.courseIds,
          frequency: existing?.frequency,
          spots: existing?.spots ?? first.spots,
          spots_left: existing?.spots_left ?? first.spots_left,
          schedules: existing?.schedules || [],
          date: first.date, time: first.time, end_time: first.end_time, duration: first.duration,
          price: first.price,
          intensity: existing?.intensity || first.intensity || "none", reminder_timing: existing?.reminder_timing || first.reminder_timing || "1j",
          inclusions: first.inclusions || "", card_yoga_count: first.card_yoga_count || 0,
          complementary_info: existing?.complementary_info || first.complementary_info || "",
          workshopEvents,
        });
      }
    }

    const unified = [...activitiesByName.values()];
    unified.sort((a, b) => a.name.localeCompare(b.name));
    setActivities(unified);
    if (instrRes.data) setInstructorsList(instrRes.data as { id: string; name: string }[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { activities, instructorsList, loading, refetch: fetchData };
}
