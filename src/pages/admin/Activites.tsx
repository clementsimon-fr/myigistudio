import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Loader2, Search, Mail, FileText, CreditCard, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useUnifiedActivities } from "@/hooks/useUnifiedActivities";
import { ActivityDescriptionSection } from "@/components/admin/activites/ActivityDescriptionSection";
import { ActivityTarifSection } from "@/components/admin/activites/ActivityTarifSection";
import { ActivityRemindersSection } from "@/components/admin/activites/ActivityRemindersSection";
import { ActivityCard } from "@/components/admin/activites/ActivityCard";
import {
  CATEGORIES, INITIAL_DEFAULT_REMINDER, INITIAL_DEFAULT_MODALITIES, calcDuration, emptyEvent, emptyForm,
  type Schedule, type WorkshopEvent, type UnifiedActivity, type EventSlot, type ActivityForm,
} from "@/components/admin/activites/types";

// ══════════════════════════════════════════════════════════
// ── EDITOR SECTION TABS ──
// ══════════════════════════════════════════════════════════
type EditorSection = "description" | "tarif" | "reminders";

const EDITOR_SECTIONS: { key: EditorSection; label: string; icon: React.ReactNode }[] = [
  { key: "description", label: "Description", icon: <FileText className="h-4 w-4" /> },
  { key: "tarif", label: "Tarifs", icon: <CreditCard className="h-4 w-4" /> },
  { key: "reminders", label: "Modalités", icon: <Mail className="h-4 w-4" /> },
];

// ══════════════════════════════════════════════════════════
// ── FULL-PAGE EDITOR COMPONENT ──
// ══════════════════════════════════════════════════════════
function ActivityEditor({
  form, setForm, editingActivity, instructorsList, onSave, onCancel, onDelete,
}: {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
  editingActivity: UnifiedActivity | null;
  instructorsList: { id: string; name: string }[];
  onSave: (closeAfter?: boolean) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [section, setSection] = useState<EditorSection>("description");

  // ── Auto-save with debounce ──
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isFirstRender = useRef(true);

  // Flush pending auto-save (used when leaving the editor)
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      onSave(false);
    }
  }, [onSave]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!editingActivity) return; // only auto-save for existing activities
    setAutoSaveStatus("idle");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus("saving");
      onSave(false);
      saveTimerRef.current = null;
      setTimeout(() => setAutoSaveStatus("saved"), 500);
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [form]);

  const handleBack = () => {
    flushSave();
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-display font-semibold truncate">
            {editingActivity ? form.name || "Modifier l'activité" : "Nouvelle activité"}
          </h2>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            {editingActivity ? "Modification en cours" : "Création d'une nouvelle activité"}
            {editingActivity && autoSaveStatus === "saving" && <span className="text-amber-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enregistrement...</span>}
            {editingActivity && autoSaveStatus === "saved" && <span className="text-emerald-500">✓ Enregistré</span>}
          </p>
        </div>
        {!editingActivity && (
          <Button onClick={() => onSave(true)} disabled={!form.name || form.events.length === 0} className="shrink-0 min-h-[44px]">
            Créer
          </Button>
        )}
      </div>

      {/* Section navigation */}
      <div className="grid grid-cols-2 gap-2 pb-3 border-b sm:flex sm:gap-1.5 sm:pb-0 sm:border-b sm:overflow-x-auto">
        {EDITOR_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-3 sm:py-2.5 min-h-[44px] text-sm font-semibold sm:font-medium rounded-lg sm:rounded-t-lg sm:rounded-b-none border sm:border-0 sm:border-b-2 sm:-mb-[2px] whitespace-nowrap transition-colors ${
              section === s.key
                ? "bg-primary text-primary-foreground border-primary sm:bg-primary/5 sm:text-primary sm:border-primary"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 sm:border-transparent"
            }`}
          >
            {s.icon}
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {section === "description" && (
        <div className="space-y-6">
          <ActivityDescriptionSection form={form} setForm={setForm} instructorsList={instructorsList} />
          {editingActivity && (
            <div className="border-t pt-4">
              <Button variant="destructive" className="gap-1.5 min-h-[44px]" onClick={onDelete}>
                <Trash2 className="h-4 w-4" /> Supprimer cette activité
              </Button>
            </div>
          )}
        </div>
      )}
      {section === "tarif" && (
        <ActivityTarifSection form={form} setForm={setForm} />
      )}
      {section === "reminders" && (
        <ActivityRemindersSection form={form} setForm={setForm} />
      )}

      {/* Footer */}
      {!editingActivity && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" className="min-h-[44px]" onClick={handleBack}>Annuler</Button>
          <Button className="min-h-[44px]" onClick={() => onSave(true)} disabled={!form.name || form.events.length === 0}>
            Créer l'activité
          </Button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ── MAIN PAGE ──
// ══════════════════════════════════════════════════════════
export default function AdminActivites() {
  const { toast } = useToast();
  const { get: getSetting, ready: settingsReady } = useSiteSettings();
  const { activities, instructorsList, loading, refetch: fetchData } = useUnifiedActivities();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Editor state: when editorOpen, show full-page editor instead of list
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<UnifiedActivity | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm());
  const [deletingItem, setDeletingItem] = useState<{ id: string; source: "course" | "workshop" } | null>(null);

  const currentDefaultReminder = settingsReady ? getSetting("default_reminder", INITIAL_DEFAULT_REMINDER) : INITIAL_DEFAULT_REMINDER;
  const currentDefaultModalities = settingsReady ? getSetting("default_modalities", INITIAL_DEFAULT_MODALITIES) : INITIAL_DEFAULT_MODALITIES;

  const filtered = useMemo(() => {
    let list = activities;
    if (categoryFilter !== "all") list = list.filter(a => a.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    return list;
  }, [activities, categoryFilter, searchQuery]);

  const openNew = () => {
    setEditingActivity(null);
    setForm({ ...emptyForm(), default_reminder: currentDefaultReminder, default_modalities: currentDefaultModalities });
    setEditorOpen(true);
  };

  const duplicateActivity = async (a: UnifiedActivity) => {
    const newName = `${a.name} (copie)`;
    if (a.source === "course" && a.courseIds && a.courseIds.length > 0) {
      const { data: srcCourse, error: fetchErr } = await supabase.from("courses").select("*").eq("id", a.courseIds[0]).single();
      if (fetchErr || !srcCourse) { toast({ title: "Erreur duplication", description: fetchErr?.message, variant: "destructive" }); return; }
      const { id: _id, created_at: _ca, ...rest } = srcCourse as any;
      const { error } = await supabase.from("courses").insert({ ...rest, name: newName } as any);
      if (error) { toast({ title: "Erreur duplication", description: error.message, variant: "destructive" }); return; }
    } else if (a.source === "workshop" && a.workshopEvents && a.workshopEvents.length > 0) {
      const srcId = a.workshopEvents[0].id;
      const { data: srcWs, error: fetchErr } = await supabase.from("workshops").select("*").eq("id", srcId).single();
      if (fetchErr || !srcWs) { toast({ title: "Erreur duplication", description: fetchErr?.message, variant: "destructive" }); return; }
      const { id: _id, created_at: _ca, linked_group: _lg, ...rest } = srcWs as any;
      const { error } = await supabase.from("workshops").insert({ ...rest, name: newName, linked_group: null } as any);
      if (error) { toast({ title: "Erreur duplication", description: error.message, variant: "destructive" }); return; }
    } else {
      toast({ title: "Impossible de dupliquer cette activité", variant: "destructive" });
      return;
    }
    toast({ title: `"${newName}" créée ✓`, description: "Vous pouvez maintenant l'éditer." });
    await fetchData();
  };

  const openEdit = (a: UnifiedActivity) => {
    setEditingActivity(a);
    const events: EventSlot[] = [];
    if (a.schedules?.length) {
      for (const s of a.schedules) {
        events.push({
          type: "recurring", frequency: a.frequency || "hebdomadaire",
          day: s.day, time: s.time, end_time: s.end_time, spots: s.spots,
          date: "", price: s.price || 0,
          reminder_template: a.reminder_template, modalities: a.modalities,
          customDates: [],
          inclusions: s.inclusions || "", card_yoga_count: s.card_yoga_count || 0,
          complementary_info: "",
          linkedDates: [],
          _scheduleId: s.id,
        });
      }
    }
    if (a.workshopEvents?.length) {
      // Check if there are linked groups
      const linkedGroups: Record<string, WorkshopEvent[]> = {};
      const standalone: WorkshopEvent[] = [];
      for (const we of a.workshopEvents) {
        if (we.linked_group) {
          if (!linkedGroups[we.linked_group]) linkedGroups[we.linked_group] = [];
          linkedGroups[we.linked_group].push(we);
        } else {
          standalone.push(we);
        }
      }
      // Create multi-sessions events for linked groups
      for (const [groupId, groupEvents] of Object.entries(linkedGroups)) {
        const sortedGroup = [...groupEvents].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        const first = sortedGroup[0];
        const dateToWorkshop = new Map<string, WorkshopEvent>();
        for (const ge of sortedGroup) {
          if (ge.date && !dateToWorkshop.has(ge.date)) {
            dateToWorkshop.set(ge.date, ge);
          }
        }
        const linkedDates = [...dateToWorkshop.keys()].sort();
        const linkedWorkshopIds = linkedDates.map(date => dateToWorkshop.get(date)?.id).filter((id): id is string => !!id);

        events.push({
          type: "multi-sessions", frequency: "hebdomadaire",
          day: "Lundi", time: first.time || "09:00", end_time: first.end_time || "10:00",
          spots: first.spots || 8, date: "", price: first.price || 0,
          reminder_template: a.reminder_template, modalities: a.modalities,
          customDates: [],
          inclusions: first.inclusions || "", card_yoga_count: first.card_yoga_count || 0,
          complementary_info: "",
          linkedDates,
          _linkedGroup: groupId,
          _workshopId: first.id,
          _linkedWorkshopIds: linkedWorkshopIds,
        });
      }
      // Create ponctuel events for standalone workshops
      for (const we of standalone) {
        events.push({
          type: "ponctuel", frequency: "hebdomadaire",
          day: "Lundi", time: we.time || "09:00", end_time: we.end_time || "10:00",
          spots: we.spots || 8, date: we.date || "", price: we.price || 0,
          reminder_template: a.reminder_template, modalities: a.modalities,
          customDates: [],
          inclusions: we.inclusions || "", card_yoga_count: we.card_yoga_count || 0,
          complementary_info: "",
          linkedDates: [],
          _workshopId: we.id,
        });
      }
    }
    if (events.length === 0) events.push(emptyEvent());
    const firstSched = a.schedules?.[0];
    const firstWsEvt = a.workshopEvents?.[0];
    const defaultPriceVal = firstSched?.price ?? firstWsEvt?.price ?? 0;
    const defaultCardVal = firstSched?.card_yoga_count ?? firstWsEvt?.card_yoga_count ?? 1;
    const defaultInclusionsVal = firstSched?.inclusions || firstWsEvt?.inclusions || "";
    setForm({
      name: a.name, description: a.description, long_description: a.long_description,
      category: a.category, instructor: a.instructor, image: a.image, images: a.images || [], spots: a.spots || 12, events,
      default_reminder: a.reminder_template || currentDefaultReminder,
      default_modalities: a.modalities || currentDefaultModalities,
      intensity: a.intensity || "none",
      reminder_timing: a.reminder_timing || "1j",
      default_price: defaultPriceVal,
      default_card_yoga_count: defaultCardVal,
      default_inclusions: defaultInclusionsVal,
      default_complementary_info: a.complementary_info || "",
    });
    setEditorOpen(true);
  };

  const save = async (closeAfter = true) => {
    const instrId = instructorsList.find(i => i.name === form.instructor)?.id || null;
    const targetCourseIds = editingActivity?.courseIds || (editingActivity?.source === "course" ? [editingActivity.id] : []);
    const primaryCourseId = targetCourseIds[0];

    const recurringEvents = form.events.filter(e => e.type === "recurring" && e.frequency !== "personnalise");
    const customDateEvents = form.events.filter(e => e.type === "recurring" && e.frequency === "personnalise");
    const ponctuelEvents = form.events.filter(e => e.type === "ponctuel");
    const multiSessionEvents = form.events.filter(e => e.type === "multi-sessions");

    const allPonctuelEvents: EventSlot[] = [...ponctuelEvents];
    for (const evt of customDateEvents) {
      for (const dateStr of evt.customDates) {
        allPonctuelEvents.push({ ...evt, type: "ponctuel", date: dateStr });
      }
    }

    // Shared fields (without 'instructor' which doesn't exist in workshops table)
    // Defaults appliqués à tous les événements (saisis dans la rubrique Description)
    const dPrice = form.default_price || 0;
    const dCard = form.default_card_yoga_count || 0;
    const dInclusions = form.default_inclusions || "";

    const sharedData = {
      name: form.name, description: form.description, long_description: form.long_description,
      category: form.category, instructor_id: instrId,
      image: form.image, images: form.images,
      reminder_template: form.default_reminder,
      modalities: form.default_modalities,
      intensity: form.intensity === "none" ? "" : form.intensity, reminder_timing: form.reminder_timing,
      inclusions: dInclusions,
      complementary_info: form.default_complementary_info || "",
    };
    // courses table has 'instructor' column, workshops does not
    const courseData = { ...sharedData, instructor: form.instructor, price: dPrice, card_yoga_count: dCard };
    const workshopData = sharedData;

    // ── Handle recurring events → courses table ──
    if (recurringEvents.length > 0) {
      const firstSlot = recurringEvents[0];
      const duration = calcDuration(firstSlot.time, firstSlot.end_time);
      const days = [...new Set(recurringEvents.map(e => e.day))];

      if (primaryCourseId) {
        await supabase.from("courses").update({
          ...courseData,
          spots: firstSlot.spots, spots_left: firstSlot.spots,
          day: firstSlot.day, time: firstSlot.time, end_time: firstSlot.end_time,
          duration, days, frequency: firstSlot.frequency,
        } as any).eq("id", primaryCourseId);

        await supabase.from("course_schedules").delete().eq("course_id", primaryCourseId);
        const scheduleRows = recurringEvents.map(e => ({
          course_id: primaryCourseId, day: e.day, time: e.time, end_time: e.end_time,
          spots: e.spots, spots_left: e.spots, price: dPrice,
          inclusions: dInclusions, card_yoga_count: dCard,
        }));

        await supabase.from("course_schedules").insert(scheduleRows);
      } else {
        if (editingActivity?.source === "workshop") {
          await supabase.from("workshops").delete().eq("id", editingActivity.id);
        }
        const { data } = await supabase.from("courses").insert({
          ...courseData,
          spots: firstSlot.spots, spots_left: firstSlot.spots,
          day: firstSlot.day, time: firstSlot.time, end_time: firstSlot.end_time,
          duration, days, frequency: firstSlot.frequency,
        } as any).select("id").single();
        if (data) {
          const scheduleRows = recurringEvents.map(e => ({
            course_id: data.id, day: e.day, time: e.time, end_time: e.end_time,
            spots: e.spots, spots_left: e.spots, price: dPrice,
            inclusions: dInclusions, card_yoga_count: dCard,
          }));

          await supabase.from("course_schedules").insert(scheduleRows);
        }
      }
    } else if (targetCourseIds.length > 0) {
      await supabase.from("course_schedules").delete().in("course_id", targetCourseIds);
      await supabase.from("courses").delete().in("id", targetCourseIds);
    }

    // ── Handle ponctuel + multi-sessions events → workshops table ──
    const validPonctuelEvents = allPonctuelEvents.filter(e => !!e.date);
    // Collect all existing workshop IDs for this activity group
    const allExistingWsIds = new Set<string>(
      editingActivity?.workshopEvents?.map(we => we.id) || []
    );
    const keptWsIds = new Set<string>();

    // Save standalone ponctuel events (no linked_group)
    if (validPonctuelEvents.length > 0) {
      for (const evt of validPonctuelEvents) {
        const duration = calcDuration(evt.time, evt.end_time);
        const wsPayload = {
          ...workshopData,
          date: evt.date, time: evt.time, end_time: evt.end_time,
          duration, spots: evt.spots, spots_left: evt.spots, price: dPrice,
          frequency: "ponctuel",
          inclusions: dInclusions, card_yoga_count: dCard,
          linked_group: null,
        };

        if (evt._workshopId) {
          keptWsIds.add(evt._workshopId);
          const { error } = await supabase.from("workshops").update(wsPayload as any).eq("id", evt._workshopId);
          if (error) {
            console.error("Workshop update error:", error);
            toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
          }
        } else {
          const { data, error } = await supabase.from("workshops").insert(wsPayload as any).select("id").single();
          if (error) {
            console.error("Workshop insert error:", error);
            toast({ title: "Erreur lors de la création", description: error.message, variant: "destructive" });
          }
          if (data) {
            evt._workshopId = data.id;
            keptWsIds.add(data.id);
          }
        }
      }
    }

    // Save multi-sessions events (with linked_group)
    for (const evt of multiSessionEvents) {
      const validDates = [...new Set(evt.linkedDates.map(d => d?.trim()).filter(Boolean) as string[])].sort();
      if (validDates.length === 0) continue;

      const linkedGroupId = evt._linkedGroup || crypto.randomUUID();
      evt._linkedGroup = linkedGroupId;
      evt.linkedDates = validDates;
      const duration = calcDuration(evt.time, evt.end_time);

      const previousLinkedWorkshopIds = evt._linkedWorkshopIds || [];
      const nextLinkedWorkshopIds: string[] = [];

      for (let i = 0; i < validDates.length; i++) {
        const dateStr = validDates[i];
        const existingWorkshopId = previousLinkedWorkshopIds[i];
        const wsPayload = {
          ...workshopData,
          date: dateStr,
          time: evt.time,
          end_time: evt.end_time,
          duration,
          spots: evt.spots,
          spots_left: evt.spots,
          price: dPrice,
          frequency: "multi-sessions",
          inclusions: dInclusions,
          card_yoga_count: dCard,
          linked_group: linkedGroupId,
        };

        if (existingWorkshopId) {
          const { error } = await supabase.from("workshops").update(wsPayload as any).eq("id", existingWorkshopId);
          if (error) {
            console.error("Multi-session workshop update error:", error);
            toast({ title: "Erreur lors de la mise à jour", description: error.message, variant: "destructive" });
          }
          nextLinkedWorkshopIds.push(existingWorkshopId);
          keptWsIds.add(existingWorkshopId);
          allExistingWsIds.delete(existingWorkshopId);
        } else {
          const { data, error } = await supabase.from("workshops").insert(wsPayload as any).select("id").single();
          if (error) {
            console.error("Multi-session workshop insert error:", error);
            toast({ title: "Erreur lors de la création", description: error.message, variant: "destructive" });
          }
          if (data?.id) {
            nextLinkedWorkshopIds.push(data.id);
            keptWsIds.add(data.id);
          }
        }
      }

      for (const staleId of previousLinkedWorkshopIds.slice(validDates.length)) {
        await supabase.from("workshops").delete().eq("id", staleId);
        allExistingWsIds.delete(staleId);
      }

      const { data: groupRows } = await supabase.from("workshops").select("id").eq("linked_group", linkedGroupId);
      if (groupRows) {
        for (const row of groupRows as { id: string }[]) {
          if (!nextLinkedWorkshopIds.includes(row.id)) {
            await supabase.from("workshops").delete().eq("id", row.id);
            allExistingWsIds.delete(row.id);
          }
        }
      }

      evt._linkedWorkshopIds = nextLinkedWorkshopIds;
      evt._workshopId = nextLinkedWorkshopIds[0];
    }

    // Delete workshop rows that were removed from the editor
    for (const oldId of allExistingWsIds) {
      if (!keptWsIds.has(oldId)) {
        await supabase.from("workshops").delete().eq("id", oldId);
      }
    }

    if (closeAfter) {
      toast({ title: editingActivity ? "Activité modifiée" : "Activité créée ✓" });
      setEditorOpen(false);
      fetchData();
    } else {
      if (targetCourseIds.length > 1) {
        await supabase.from("course_schedules").delete().in("course_id", targetCourseIds.slice(1));
        await supabase.from("courses").delete().in("id", targetCourseIds.slice(1));
      }
      // Persist _workshopId and _linkedWorkshopIds back to form state to prevent duplicate inserts on next auto-save
      setForm(prev => ({ ...prev, events: prev.events.map((e, i) => {
        const allEvts = [...allPonctuelEvents, ...multiSessionEvents];
        // Match ponctuel events by index from the combined list
        if (e.type === "ponctuel" || (e.type === "recurring" && e.frequency === "personnalise")) {
          const matching = allPonctuelEvents.find(pe => pe.date === e.date && pe.time === e.time && pe._workshopId);
          if (matching) return { ...e, _workshopId: matching._workshopId };
        }
        if (e.type === "multi-sessions") {
          const matching = multiSessionEvents.find(me => me._linkedGroup === e._linkedGroup || (me.linkedDates.join() === e.linkedDates.join()));
          if (matching) return { ...e, _workshopId: matching._workshopId, _linkedGroup: matching._linkedGroup, _linkedWorkshopIds: matching._linkedWorkshopIds };
        }
        return e;
      }) }));
    }
  };

  const executeDelete = async () => {
    if (!deletingItem) return;
    const act = activities.find(a => a.id === deletingItem.id || a.courseIds?.includes(deletingItem.id) || a.workshopEvents?.some(we => we.id === deletingItem.id));
    if (act?.courseIds?.length) {
      await supabase.from("course_schedules").delete().in("course_id", act.courseIds);
      await supabase.from("courses").delete().in("id", act.courseIds);
    } else if (deletingItem.source === "course") {
      await supabase.from("course_schedules").delete().eq("course_id", deletingItem.id);
      await supabase.from("courses").delete().eq("id", deletingItem.id);
    }
    if (act?.workshopEvents?.length) {
      await supabase.from("workshops").delete().in("id", act.workshopEvents.map(we => we.id));
    } else if (deletingItem.source === "workshop") {
      await supabase.from("workshops").delete().eq("id", deletingItem.id);
    }
    toast({ title: "Activité supprimée", variant: "destructive" });
    setDeletingItem(null);
    fetchData();
  };

  if (loading) {
    return (
      <AdminLayout title="Fiches activités">
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fiches activités">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <Badge
              variant={categoryFilter === "all" ? "default" : "outline"}
              className={`cursor-pointer text-sm h-8 px-3`}
              onClick={() => setCategoryFilter("all")}
            >Toutes</Badge>
            {CATEGORIES.map(c => {
              const isActive = categoryFilter === c.value;
              return (
                <Badge
                  key={c.value}
                  variant={isActive ? "default" : "outline"}
                  className={`cursor-pointer text-sm h-8 px-3 gap-1 ${isActive && c.activeBg ? `${c.activeBg} text-white border-transparent hover:opacity-90` : ""}`}
                  onClick={() => setCategoryFilter(c.value)}
                >
                  {c.dot && <div className={`w-2 h-2 rounded-full ${isActive ? "bg-white/80" : c.dot}`} />}
                  {c.label}
                </Badge>
              );
            })}
          </div>
          <div className="relative flex-1 w-full sm:w-auto sm:max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
          </div>
        </div>

        <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 self-start" onClick={openNew}>
          <Plus className="h-4 w-4" /> Nouvelle activité
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{filtered.length} activité{filtered.length > 1 ? "s" : ""}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => (
          <ActivityCard key={`${a.source}-${a.id}`} activity={a} onEdit={() => openEdit(a)} onDuplicate={() => duplicateActivity(a)} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucune activité trouvée.</div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette activité ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Drawer d'édition activité (ouverture vers le bas) */}
      <Sheet open={editorOpen} onOpenChange={(o) => { if (!o) { setEditorOpen(false); fetchData(); } }}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-4 sm:p-6">
          {editorOpen && (
            <ActivityEditor
              form={form}
              setForm={setForm}
              editingActivity={editingActivity}
              instructorsList={instructorsList}
              onSave={save}
              onCancel={() => { setEditorOpen(false); fetchData(); }}
              onDelete={() => {
                if (editingActivity) {
                  setEditorOpen(false);
                  setDeletingItem({ id: editingActivity.id, source: editingActivity.source });
                }
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
