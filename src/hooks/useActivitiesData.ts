import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Instructor {
  id: string;
  name: string;
  photo_url: string;
}

export interface Schedule {
  id: string;
  course_id: string;
  day: string;
  time: string;
  end_time: string;
  spots: number;
  spots_left: number;
  inclusions?: string;
  card_yoga_count?: number;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  long_description: string;
  category: string;
  instructor: string;
  instructor_id: string | null;
  spots: number;
  spots_left: number;
  image: string;
  images?: string[];
  frequency?: string;
}

export interface Workshop {
  id: string;
  name: string;
  description: string;
  long_description: string;
  category: string;
  date: string;
  time: string;
  end_time: string;
  duration: string;
  frequency: string;
  price: number;
  spots: number;
  spots_left: number;
  image: string;
  images?: string[];
  instructor_id: string | null;
  inclusions?: string;
  card_yoga_count?: number;
  linked_group?: string | null;
}

export function useActivitiesData() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [instructors, setInstructors] = useState<Record<string, Instructor>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [coursesRes, schedulesRes, workshopsRes, instructorsRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("course_schedules").select("*"),
        supabase.from("workshops").select("*").order("date"),
        supabase.from("instructors").select("id, name, photo_url").eq("active", true),
      ]);

      const instrMap: Record<string, Instructor> = {};
      if (instructorsRes.data) {
        for (const inst of instructorsRes.data) instrMap[inst.id] = inst;
      }
      setInstructors(instrMap);

      if (coursesRes.data) setCourses(coursesRes.data as unknown as Course[]);
      if (schedulesRes.data) setSchedules(schedulesRes.data as unknown as Schedule[]);
      if (workshopsRes.data) {
        const uniqueWorkshops = new Map<string, Workshop>();
        for (const ws of workshopsRes.data as unknown as Workshop[]) {
          const key = ws.linked_group
            ? `group:${ws.linked_group}:${ws.date}`
            : `single:${ws.name}:${ws.date}:${ws.time}:${ws.end_time}`;
          if (!uniqueWorkshops.has(key)) {
            uniqueWorkshops.set(key, ws);
          }
        }
        setWorkshops([...uniqueWorkshops.values()].sort((a, b) => a.date.localeCompare(b.date)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const getInstructorPhoto = (instructorId: string | null, instructorName?: string): string | undefined => {
    if (instructorId && instructors[instructorId]?.photo_url) return instructors[instructorId].photo_url;
    if (instructorName) {
      const m = Object.values(instructors).find(i => i.name === instructorName);
      if (m?.photo_url) return m.photo_url;
    }
    return undefined;
  };

  return { courses, schedules, workshops, instructors, loading, getInstructorPhoto };
}
