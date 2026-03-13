import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, User, CalendarDays, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Instructor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  bio: string;
  active: boolean;
  created_at: string;
}

interface CourseAssignment {
  id: string;
  name: string;
  category: string;
  schedules: { day: string; time: string; end_time: string }[];
}

interface WorkshopAssignment {
  id: string;
  name: string;
  category: string;
  date: string;
  time: string;
}

const SPECIALTY_OPTIONS = ["Yoga", "Pilates", "Poterie", "Bien-être", "Méditation", "Vinyasa", "Yin", "Hatha"];

export default function AdminIntervenants() {
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);

  // Assignments
  const [courses, setCourses] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const emptyForm = { name: "", email: "", phone: "", specialties: [] as string[], bio: "", active: true };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    const [instrRes, coursesRes, workshopsRes, schedsRes] = await Promise.all([
      supabase.from("instructors").select("*").order("name"),
      supabase.from("courses").select("*"),
      supabase.from("workshops").select("*"),
      supabase.from("course_schedules").select("*"),
    ]);
    if (instrRes.data) setInstructors(instrRes.data as unknown as Instructor[]);
    if (coursesRes.data) setCourses(coursesRes.data);
    if (workshopsRes.data) setWorkshops(workshopsRes.data);
    if (schedsRes.data) setSchedules(schedsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getAssignments = (instructorId: string, instructorName: string) => {
    // Match by instructor_id or by instructor name (backward compat)
    const assignedCourses = courses.filter(c => c.instructor_id === instructorId || c.instructor === instructorName);
    const assignedWorkshops = workshops.filter(w => w.instructor_id === instructorId);

    const courseAssignments: CourseAssignment[] = assignedCourses.map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      schedules: schedules.filter(s => s.course_id === c.id).map((s: any) => ({ day: s.day, time: s.time, end_time: s.end_time })),
    }));

    const workshopAssignments: WorkshopAssignment[] = assignedWorkshops.map(w => ({
      id: w.id,
      name: w.name,
      category: w.category,
      date: w.date,
      time: w.time,
    }));

    return { courses: courseAssignments, workshops: workshopAssignments };
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (i: Instructor) => {
    setEditingId(i.id);
    setForm({ name: i.name, email: i.email, phone: i.phone, specialties: i.specialties || [], bio: i.bio, active: i.active });
    setDialogOpen(true);
  };

  const save = async () => {
    if (editingId) {
      await supabase.from("instructors").update(form as any).eq("id", editingId);
      toast({ title: "Intervenant modifié" });
    } else {
      await supabase.from("instructors").insert(form as any);
      toast({ title: "Intervenant créé" });
    }
    setDialogOpen(false);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await supabase.from("instructors").delete().eq("id", deletingId);
    toast({ title: "Intervenant supprimé", variant: "destructive" });
    setDeletingId(null);
    fetchData();
  };

  const toggleSpecialty = (spec: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(spec)
        ? prev.specialties.filter(s => s !== spec)
        : [...prev.specialties, spec],
    }));
  };

  if (loading) {
    return (
      <AdminLayout title="Intervenants">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Intervenants">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{instructors.length} intervenant{instructors.length > 1 ? "s" : ""}</p>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> Ajouter un intervenant
        </Button>
      </div>

      {/* Instructor cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instructors.map(inst => {
          const assignments = getAssignments(inst.id, inst.name);
          const totalActivities = assignments.courses.length + assignments.workshops.length;

          return (
            <div key={inst.id} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-dark" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{inst.name}</h3>
                    {inst.email && <p className="text-xs text-muted-foreground">{inst.email}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(inst)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingId(inst.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {inst.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {inst.specialties.map(s => (
                    <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                  ))}
                </div>
              )}

              {inst.bio && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{inst.bio}</p>}

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{totalActivities} activité{totalActivities > 1 ? "s" : ""}</span>
                  {totalActivities > 0 && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setSelectedInstructor(inst)}>
                      Voir le planning
                    </Button>
                  )}
                </div>
                {assignments.courses.slice(0, 2).map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <CalendarDays className="h-3 w-3" />
                    <span>{c.name}</span>
                    {c.schedules.length > 0 && (
                      <span className="text-muted-foreground/60">
                        · {c.schedules.map(s => s.day.slice(0, 3)).join(", ")}
                      </span>
                    )}
                  </div>
                ))}
                {totalActivities > 2 && (
                  <p className="text-xs text-muted-foreground/60">+{totalActivities - 2} autres</p>
                )}
              </div>

              {!inst.active && (
                <Badge variant="secondary" className="mt-2 text-xs">Inactif</Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? "Modifier" : "Nouvel"} intervenant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@..." /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="06..." /></div>
            </div>
            <div>
              <Label>Spécialités</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {SPECIALTY_OPTIONS.map(spec => (
                  <Badge
                    key={spec}
                    variant={form.specialties.includes(spec) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleSpecialty(spec)}
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
            <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Présentation courte..." /></div>
            <Button className="w-full" onClick={save} disabled={!form.name}>{editingId ? "Enregistrer" : "Créer l'intervenant"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planning dialog */}
      <Dialog open={!!selectedInstructor} onOpenChange={(open) => !open && setSelectedInstructor(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedInstructor && (() => {
            const assignments = getAssignments(selectedInstructor.id, selectedInstructor.name);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display">Planning de {selectedInstructor.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {assignments.courses.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Cours réguliers</h4>
                      <div className="space-y-2">
                        {assignments.courses.map(c => (
                          <div key={c.id} className="rounded-lg border bg-primary/5 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{c.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">{c.category}</Badge>
                            </div>
                            <div className="mt-1.5 space-y-1">
                              {c.schedules.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{s.day} · {s.time} - {s.end_time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {assignments.workshops.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Ateliers</h4>
                      <div className="space-y-2">
                        {assignments.workshops.map(w => (
                          <div key={w.id} className="rounded-lg border bg-secondary/10 p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{w.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">{w.category}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <CalendarDays className="h-3 w-3" />
                              <span>{new Date(w.date).toLocaleDateString("fr-FR")} · {w.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {assignments.courses.length === 0 && assignments.workshops.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune activité assignée.</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet intervenant ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L'intervenant sera retiré de la liste.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
