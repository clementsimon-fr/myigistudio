import { useState, useEffect, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, User, CalendarDays, Clock, Link2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Instructor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  urls: string[];
  bio: string;
  active: boolean;
  photo_url: string;
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

// Will be dynamically built from courses/workshops
function buildSpecialtiesFromActivities(courses: any[], workshops: any[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const c of courses) {
    const cat = c.category === "yoga" ? "Yoga & Pilates" : c.category;
    if (!map[cat]) map[cat] = new Set();
    map[cat].add(c.name);
  }
  for (const w of workshops) {
    const cat = w.category === "poterie" ? "Poterie" : w.category === "bien-etre" ? "Bien-être" : w.category;
    if (!map[cat]) map[cat] = new Set();
    map[cat].add(w.name);
  }
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(map)) result[k] = [...v].sort();
  return result;
}

export default function AdminIntervenants() {
  const { toast } = useToast();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);

  const [courses, setCourses] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);

  const emptyForm = { name: "", email: "", phone: "", specialties: [] as string[], urls: [""] as string[], bio: "", active: true, photo_url: "" };
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

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
    const assignedCourses = courses.filter(c => c.instructor_id === instructorId || c.instructor === instructorName);
    const assignedWorkshops = workshops.filter(w => w.instructor_id === instructorId);

    const courseAssignments: CourseAssignment[] = assignedCourses.map(c => ({
      id: c.id, name: c.name, category: c.category,
      schedules: schedules.filter(s => s.course_id === c.id).map((s: any) => ({ day: s.day, time: s.time, end_time: s.end_time })),
    }));

    const workshopAssignments: WorkshopAssignment[] = assignedWorkshops.map(w => ({
      id: w.id, name: w.name, category: w.category, date: w.date, time: w.time,
    }));

    return { courses: courseAssignments, workshops: workshopAssignments };
  };

  const openNew = () => { setEditingId(null); setForm(emptyForm); setSelectedCategory(""); setDialogOpen(true); };
  const openEdit = (i: Instructor) => {
    setEditingId(i.id);
    setForm({ name: i.name, email: i.email, phone: i.phone, specialties: i.specialties || [], urls: (i.urls && i.urls.length > 0) ? i.urls : [""], bio: i.bio, active: i.active, photo_url: i.photo_url || "" });
    setSelectedCategory("");
    setDialogOpen(true);
  };

  const save = async () => {
    const cleanUrls = form.urls.filter(u => u.trim() !== "");
    const payload = { ...form, urls: cleanUrls, photo_url: form.photo_url };
    if (editingId) {
      await supabase.from("instructors").update(payload as any).eq("id", editingId);
      toast({ title: "Intervenant modifié" });
    } else {
      await supabase.from("instructors").insert(payload as any);
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

  const addSpecialty = (service: string) => {
    const label = selectedCategory ? `${selectedCategory} — ${service}` : service;
    if (!form.specialties.includes(label)) {
      setForm(prev => ({ ...prev, specialties: [...prev.specialties, label] }));
    }
  };

  const removeSpecialty = (spec: string) => {
    setForm(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== spec) }));
  };

  const addUrl = () => setForm(prev => ({ ...prev, urls: [...prev.urls, ""] }));
  const removeUrl = (idx: number) => setForm(prev => ({ ...prev, urls: prev.urls.filter((_, i) => i !== idx) }));
  const updateUrl = (idx: number, value: string) => setForm(prev => ({ ...prev, urls: prev.urls.map((u, i) => i === idx ? value : u) }));

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instructors.map(inst => {
          const assignments = getAssignments(inst.id, inst.name);
          const totalActivities = assignments.courses.length + assignments.workshops.length;

          return (
            <div key={inst.id} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {inst.photo_url ? (
                    <img src={inst.photo_url} alt={inst.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-dark" />
                    </div>
                  )}
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

              {inst.urls && inst.urls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {inst.urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <Link2 className="h-3 w-3" />
                      {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
                    </a>
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
                      <span className="text-muted-foreground/60">· {c.schedules.map(s => s.day.slice(0, 3)).join(", ")}</span>
                    )}
                  </div>
                ))}
                {totalActivities > 2 && (
                  <p className="text-xs text-muted-foreground/60">+{totalActivities - 2} autres</p>
                )}
              </div>

              {!inst.active && <Badge variant="secondary" className="mt-2 text-xs">Inactif</Badge>}
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

            {/* Specialties: category + service */}
            <div>
              <Label>Spécialités</Label>
              {form.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                  {form.specialties.map(spec => (
                    <Badge key={spec} variant="default" className="text-xs gap-1">
                      {spec}
                      <button onClick={() => removeSpecialty(spec)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-1.5">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Activité..." /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_SERVICES).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCategory && (
                  <div className="flex flex-wrap gap-1">
                    {CATEGORY_SERVICES[selectedCategory]?.map(service => (
                      <Badge
                        key={service}
                        variant={form.specialties.includes(`${selectedCategory} — ${service}`) ? "secondary" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => addSpecialty(service)}
                      >
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* URLs */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="mb-0">Liens (site web, réseaux...)</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addUrl}>
                  <Plus className="h-3 w-3" /> Ajouter
                </Button>
              </div>
              <div className="space-y-2">
                {form.urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input value={url} onChange={e => updateUrl(idx, e.target.value)} placeholder="https://..." className="flex-1 h-8 text-sm" />
                    {form.urls.length > 1 && (
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeUrl(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <Label>Photo</Label>
              <div className="flex items-center gap-3 mt-1.5">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Photo" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary-dark/30" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      const ext = file.name.split(".").pop();
                      const path = `${Date.now()}.${ext}`;
                      const { error } = await supabase.storage.from("instructor-photos").upload(path, file);
                      if (!error) {
                        const { data: urlData } = supabase.storage.from("instructor-photos").getPublicUrl(path);
                        setForm(prev => ({ ...prev, photo_url: urlData.publicUrl }));
                      }
                      setUploading(false);
                    }}
                    className="text-xs"
                  />
                  {form.photo_url && (
                    <Button type="button" variant="link" size="sm" className="text-xs text-destructive p-0 h-auto" onClick={() => setForm(prev => ({ ...prev, photo_url: "" }))}>
                      Supprimer la photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Présentation courte..." /></div>
            <Button className="w-full" onClick={save} disabled={!form.name || uploading}>{editingId ? "Enregistrer" : "Créer l'intervenant"}</Button>
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
