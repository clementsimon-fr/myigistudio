import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
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
    title: "Page d'accueil — Hero",
    fields: [
      { key: "hero_welcome", label: "Texte d'accueil", type: "text" },
      { key: "hero_title", label: "Titre principal", type: "text" },
      { key: "hero_subtitle", label: "Sous-titre", type: "textarea" },
    ],
  },
  {
    title: "Page d'accueil — Activités",
    fields: [
      { key: "services_title", label: "Titre section", type: "text" },
      { key: "services_subtitle", label: "Sous-titre", type: "text" },
      { key: "service_yoga_desc", label: "Description Yoga", type: "textarea" },
      { key: "service_poterie_desc", label: "Description Poterie", type: "textarea" },
      { key: "service_ateliers_desc", label: "Description Ateliers", type: "textarea" },
    ],
  },
  {
    title: "Page Yoga",
    fields: [
      { key: "yoga_page_title", label: "Titre", type: "text" },
      { key: "yoga_page_subtitle", label: "Sous-titre", type: "textarea" },
      { key: "yoga_infos", label: "Infos pratiques", type: "textarea" },
    ],
  },
  {
    title: "Page Poterie",
    fields: [
      { key: "poterie_page_title", label: "Titre", type: "text" },
      { key: "poterie_page_subtitle", label: "Sous-titre", type: "textarea" },
    ],
  },
  {
    title: "Page Ateliers",
    fields: [
      { key: "ateliers_page_title", label: "Titre", type: "text" },
      { key: "ateliers_page_subtitle", label: "Sous-titre", type: "textarea" },
    ],
  },
];

export default function AdminContenu() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("key, value").then(({ data }) => {
      const map: Record<string, string> = {};
      if (data) for (const r of data) map[r.key] = r.value;
      setValues(map);
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
        {SECTIONS.map(section => (
          <div key={section.title} className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-primary-dark">{section.title}</h3>
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
