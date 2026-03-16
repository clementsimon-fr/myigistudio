import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { saveSiteSettings } from "@/hooks/useSiteSettings";

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea";
}

interface SectionDef {
  title: string;
  fields: Field[];
}

const SECTIONS: SectionDef[] = [
  {
    title: "Section Héro",
    fields: [
      { key: "hero_welcome", label: "Texte d'accueil (ex: BIENVENUE CHEZ)", type: "text" },
      { key: "hero_title", label: "Titre principal (ex: MyIgiStudio)", type: "text" },
      { key: "hero_subtitle", label: "Sous-titre", type: "textarea" },
    ],
  },
  {
    title: "Événement à la une",
    fields: [
      { key: "featured_event_title", label: "Titre de l'événement", type: "text" },
      { key: "featured_event_link", label: "Lien (URL ou chemin, ex: /?view=planning&filter=bien-etre)", type: "text" },
    ],
  },
];

export default function AdminContenu() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workshops, setWorkshops] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("workshops").select("id, name, date").gte("date", new Date().toISOString().split("T")[0]).order("date", { ascending: true }).limit(5),
    ]).then(([settingsRes, workshopsRes]) => {
      const map: Record<string, string> = {};
      if (settingsRes.data) for (const r of settingsRes.data) map[r.key] = r.value;
      setValues(map);
      if (workshopsRes.data) setWorkshops(workshopsRes.data as any[]);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const entries = Object.entries(values)
      .filter(([key]) => SECTIONS.some(s => s.fields.some(f => f.key === key)))
      .map(([key, value]) => ({ key, value }));
    await saveSiteSettings(entries);
    toast({ title: "Contenu enregistré ✓" });
    setSaving(false);
  };

  const hasFeaturedEvent = !!(values.featured_event_title?.trim());

  if (loading) {
    return (
      <AdminLayout title="Contenu du site">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Contenu du site">
      <div className="max-w-2xl space-y-8">
        {SECTIONS.map((section, idx) => (
          <div key={section.title} className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-primary-dark flex items-center gap-2">
              {idx === 1 && <Megaphone className="h-4 w-4" />}
              {section.title}
            </h3>
            {idx === 1 && (
              <p className="text-xs text-muted-foreground">
                {hasFeaturedEvent
                  ? "✅ Un événement à la une sera affiché sur la page d'accueil."
                  : "Laissez le titre vide pour ne rien afficher."}
              </p>
            )}
            {idx === 1 && workshops.length > 0 && !values.featured_event_title && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Événements à venir :</p>
                {workshops.map(w => (
                  <button
                    key={w.id}
                    className="block text-xs text-primary-dark hover:underline"
                    onClick={() => setValues(prev => ({
                      ...prev,
                      featured_event_title: w.name,
                      featured_event_link: `/?view=planning&filter=bien-etre&activity=${encodeURIComponent(w.name)}`,
                    }))}
                  >
                    {w.name} — {new Date(w.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                  </button>
                ))}
              </div>
            )}
            {section.fields.map(field => (
              <div key={field.key}>
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={values[field.key] || ""}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    placeholder={`Valeur par défaut si vide`}
                  />
                ) : (
                  <Input
                    value={values[field.key] || ""}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Valeur par défaut si vide`}
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer tout
        </Button>
      </div>
    </AdminLayout>
  );
}
