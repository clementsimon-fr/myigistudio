import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, GripVertical, ImageIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Chapter {
  id: string;
  sort_order: number;
  photo_url: string | null;
  title: string;
  content: string;
}

const BUCKET = "activity-images";

export default function Decouvrir() {
  const { toast } = useToast();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("story_chapters")
      .select("*")
      .order("sort_order", { ascending: true });
    setChapters((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addChapter = async () => {
    const max = chapters.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { data, error } = await supabase
      .from("story_chapters")
      .insert({ sort_order: max + 1, title: "Nouveau chapitre", content: "" })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setChapters((cs) => [...cs, data as any]);
  };

  const deleteChapter = async (id: string) => {
    if (!confirm("Supprimer ce chapitre ?")) return;
    await supabase.from("story_chapters").delete().eq("id", id);
    setChapters((cs) => cs.filter((c) => c.id !== id));
    toast({ title: "Chapitre supprimé" });
  };

  const updateChapter = (id: string, patch: Partial<Chapter>) => {
    setChapters((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const saveChapter = async (chapter: Chapter) => {
    setSaving(chapter.id);
    const { error } = await supabase
      .from("story_chapters")
      .update({
        title: chapter.title,
        content: chapter.content,
        photo_url: chapter.photo_url,
        sort_order: chapter.sort_order,
      })
      .eq("id", chapter.id);
    setSaving(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Enregistré" });
  };

  const uploadPhoto = async (chapter: Chapter, file: File) => {
    setSaving(chapter.id);
    const ext = file.name.split(".").pop();
    const path = `story-${chapter.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setSaving(null);
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = urlData.publicUrl;
    await supabase.from("story_chapters").update({ photo_url: url }).eq("id", chapter.id);
    updateChapter(chapter.id, { photo_url: url });
    setSaving(null);
    toast({ title: "Photo téléversée" });
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = chapters.findIndex((c) => c.id === id);
    const swap = chapters[idx + dir];
    if (!swap) return;
    const a = chapters[idx];
    const newA = { ...a, sort_order: swap.sort_order };
    const newSwap = { ...swap, sort_order: a.sort_order };
    const next = [...chapters];
    next[idx] = newA;
    next[idx + dir] = newSwap;
    next.sort((x, y) => x.sort_order - y.sort_order);
    setChapters(next);
    await Promise.all([
      supabase.from("story_chapters").update({ sort_order: newA.sort_order }).eq("id", a.id),
      supabase.from("story_chapters").update({ sort_order: newSwap.sort_order }).eq("id", swap.id),
    ]);
  };

  return (
    <AdminLayout title="Découvrir">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-primary-dark">
              Storytelling d'Elodie
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Ces chapitres apparaissent sur l'accueil au clic du bouton ★ à côté des filtres
              Yoga / Poterie. Chaque chapitre = une photo + un titre + un texte.
            </p>
          </div>
          <Button onClick={addChapter} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau chapitre
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : chapters.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground text-sm">
            Aucun chapitre. Cliquez sur « Nouveau chapitre » pour en ajouter un.
          </Card>
        ) : (
          <div className="space-y-4">
            {chapters.map((ch, i) => (
              <Card key={ch.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs">Chapitre {i + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === 0}
                      onClick={() => move(ch.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={i === chapters.length - 1}
                      onClick={() => move(ch.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteChapter(ch.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-4 flex-col md:flex-row">
                  <div className="md:w-40 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[ch.id]?.click()}
                      className="relative w-full aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/30"
                    >
                      {ch.photo_url ? (
                        <img src={ch.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      )}
                      {saving === ch.id && (
                        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => (fileInputRefs.current[ch.id] = el)}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(ch, f);
                      }}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Titre du chapitre"
                      value={ch.title}
                      onChange={(e) => updateChapter(ch.id, { title: e.target.value })}
                    />
                    <Textarea
                      placeholder="Racontez votre histoire…"
                      rows={6}
                      value={ch.content}
                      onChange={(e) => updateChapter(ch.id, { content: e.target.value })}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => saveChapter(ch)}
                        disabled={saving === ch.id}
                        className="gap-2"
                      >
                        {saving === ch.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
