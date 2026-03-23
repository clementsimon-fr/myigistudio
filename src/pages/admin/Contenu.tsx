import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Megaphone, Upload, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { saveSiteSettings } from "@/hooks/useSiteSettings";

interface Field {
  key: string;
  label: string;
  type: "text" | "textarea" | "activity-select";
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
      { key: "featured_event_activity_id", label: "Activité à mettre en avant", type: "activity-select" },
      { key: "featured_event_title", label: "Titre personnalisé (optionnel — sinon le nom de l'activité)", type: "text" },
    ],
  },
];

interface ActivityOption {
  id: string;
  name: string;
  type: "course" | "workshop";
  category: string;
  date?: string;
}

const FILTER_ICONS = [
  { key: "filter_icon_yoga", label: "Yoga" },
  { key: "filter_icon_poterie", label: "Poterie" },
  { key: "filter_icon_bien_etre", label: "Atelier" },
];

function FilterIconUploader({ settingKey, label, currentUrl, onUploaded }: { settingKey: string; label: string; currentUrl: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${settingKey}.${ext}`;
    // Remove old file first
    await supabase.storage.from("filter-icons").remove([path]);
    const { error } = await supabase.storage.from("filter-icons").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("filter-icons").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    onUploaded(url);
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-16 h-16 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex items-center justify-center overflow-hidden bg-muted/30"
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        )}
        {uploading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

export default function AdminContenu() {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activityOptions, setActivityOptions] = useState<ActivityOption[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("courses").select("id, name, category"),
      supabase.from("workshops").select("id, name, category, date").order("date", { ascending: true }),
    ]).then(([settingsRes, coursesRes, workshopsRes]) => {
      const map: Record<string, string> = {};
      if (settingsRes.data) for (const r of settingsRes.data) map[r.key] = r.value;
      setValues(map);

      const opts: ActivityOption[] = [];
      if (coursesRes.data) {
        for (const c of coursesRes.data as any[]) {
          opts.push({ id: c.id, name: c.name, type: "course", category: c.category });
        }
      }
      if (workshopsRes.data) {
        for (const w of workshopsRes.data as any[]) {
          opts.push({ id: w.id, name: w.name, type: "workshop", category: w.category, date: w.date });
        }
      }
      setActivityOptions(opts);
      setLoading(false);
    });
  }, []);

  const handleIconUploaded = async (key: string, url: string) => {
    setValues(prev => ({ ...prev, [key]: url }));
    await saveSiteSettings([{ key, value: url }]);
    toast({ title: "Icône mise à jour ✓" });
  };

  const handleSave = async () => {
    setSaving(true);
    const actId = values.featured_event_activity_id;
    const activity = activityOptions.find(a => a.id === actId);
    let link = "";
    if (activity) {
      link = `/reserver?type=${activity.type}&id=${activity.id}`;
      if (activity.date) link += `&date=${activity.date}`;
      if (!values.featured_event_title?.trim()) {
        values.featured_event_title = activity.name;
      }
    }
    values.featured_event_link = link;

    const allKeys = ["hero_welcome", "hero_title", "hero_subtitle", "featured_event_title", "featured_event_link", "featured_event_activity_id"];
    const entries = allKeys
      .filter(key => values[key] !== undefined)
      .map(key => ({ key, value: values[key] || "" }));
    await saveSiteSettings(entries);
    toast({ title: "Contenu enregistré ✓" });
    setSaving(false);
  };

  const hasFeaturedEvent = !!(values.featured_event_activity_id?.trim() || values.featured_event_title?.trim());

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
                  ? "✅ Un événement à la une sera affiché sur la page d'accueil. Le visiteur pourra cliquer pour réserver directement."
                  : "Sélectionnez une activité pour afficher un bandeau sur la page d'accueil."}
              </p>
            )}
            {section.fields.map(field => (
              <div key={field.key}>
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={values[field.key] || ""}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    placeholder="Valeur par défaut si vide"
                  />
                ) : field.type === "activity-select" ? (
                  <Select
                    value={values[field.key] || "none"}
                    onValueChange={v => {
                      const newVal = v === "none" ? "" : v;
                      setValues(prev => ({ ...prev, [field.key]: newVal }));
                      if (newVal) {
                        const act = activityOptions.find(a => a.id === newVal);
                        if (act && !values.featured_event_title?.trim()) {
                          setValues(prev => ({ ...prev, featured_event_title: act.name }));
                        }
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Choisir une activité..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun événement —</SelectItem>
                      {activityOptions.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a.date ? `(${new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })})` : "(récurrent)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={values[field.key] || ""}
                    onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder="Valeur par défaut si vide"
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        {/* Filter Icons Section */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-display font-semibold text-primary-dark flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Icônes des filtres
          </h3>
          <p className="text-xs text-muted-foreground">
            Cliquez sur une icône pour la remplacer. Les changements sont sauvegardés immédiatement.
          </p>
          <div className="flex items-start justify-center gap-6 pt-2">
            {FILTER_ICONS.map(fi => (
              <FilterIconUploader
                key={fi.key}
                settingKey={fi.key}
                label={fi.label}
                currentUrl={values[fi.key] || ""}
                onUploaded={(url) => handleIconUploaded(fi.key, url)}
              />
            ))}
          </div>
        </div>

        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer tout
        </Button>
      </div>
    </AdminLayout>
  );
}
