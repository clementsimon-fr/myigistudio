import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { saveSiteSettings } from "@/hooks/useSiteSettings";

export default function AdminContenu() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      const map: Record<string, string> = {};
      if (data) for (const r of data) map[r.key] = r.value;
      setValues(map);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const keys = ["featured_event_title", "featured_event_description"];
    const entries = keys.map((key) => ({ key, value: values[key] || "" }));
    await saveSiteSettings(entries);
    toast({ title: "Événement enregistré ✓" });
  };

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (loading || !initialLoadDone.current) {
      if (!loading) initialLoadDone.current = true;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      handleSave();
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [values]);

  if (loading) {
    return (
      <AdminLayout title="Événement">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Événement">
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-primary-dark flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Événement à la une
          </h3>
          <p className="text-xs text-muted-foreground">
            Un bandeau s'affiche sur la page d'accueil. Au clic, une fenêtre présente le titre et la description.
          </p>
          <div>
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input
              value={values.featured_event_title || ""}
              onChange={(e) => setValues((prev) => ({ ...prev, featured_event_title: e.target.value }))}
              placeholder="Ex. Atelier découverte Yoga le 15 juin"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={values.featured_event_description || ""}
              onChange={(e) => setValues((prev) => ({ ...prev, featured_event_description: e.target.value }))}
              placeholder="Détails de l'événement, horaires, lieu, modalités…"
              rows={6}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Laissez le titre vide pour masquer le bandeau.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
