import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ImageIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HomeButton {
  id: string;
  key: string;
  title: string;
  icon_url: string | null;
  sort_order: number;
}

const BUCKET = "filter-icons";
const LABEL: Record<string, string> = {
  yoga: "Bouton Yoga",
  poterie: "Bouton Poterie",
  decouvrir: "Bouton Découvrir (Histoire)",
};

export default function Boutons() {
  const { toast } = useToast();
  const [buttons, setButtons] = useState<HomeButton[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("home_buttons")
      .select("*")
      .order("sort_order");
    setButtons((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateLocal = (id: string, patch: Partial<HomeButton>) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const handleSave = async (b: HomeButton) => {
    setSaving(b.id);
    const { error } = await supabase
      .from("home_buttons")
      .update({ title: b.title, icon_url: b.icon_url })
      .eq("id", b.id);
    setSaving(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bouton mis à jour ✓" });
  };

  const handleUpload = async (b: HomeButton, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `home-buttons/${b.key}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    updateLocal(b.id, { icon_url: data.publicUrl });
    await supabase.from("home_buttons").update({ icon_url: data.publicUrl }).eq("id", b.id);
    toast({ title: "Logo mis à jour ✓" });
  };

  if (loading) {
    return (
      <AdminLayout title="Boutons d'accueil">
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Boutons d'accueil">
      <p className="text-sm text-muted-foreground mb-6">
        Personnalisez le titre des boutons affichés sur la page d'accueil (Yoga, Poterie ne servent
        plus qu'au libellé du filtre ; le logo n'est utilisé que pour "Découvrir / Histoire").
      </p>
      <div className="grid gap-4 max-w-2xl">
        {buttons.map((b) => {
          const showIcon = b.key === "decouvrir";
          return (
            <Card key={b.id} className="p-5">
              <div className="flex items-start gap-4">
                {showIcon && (
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {b.icon_url ? (
                      <img src={b.icon_url} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      {LABEL[b.key] || b.key}
                    </Label>
                    <Input
                      value={b.title}
                      onChange={(e) => updateLocal(b.id, { title: e.target.value })}
                      placeholder="Titre du bouton"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {showIcon && (
                      <>
                        <input
                          ref={(el) => (fileRefs.current[b.id] = el)}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload(b, f);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileRefs.current[b.id]?.click()}
                        >
                          <ImageIcon className="h-4 w-4 mr-1.5" /> Changer le logo
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSave(b)}
                      disabled={saving === b.id}
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      {saving === b.id ? "..." : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
