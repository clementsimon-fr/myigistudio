import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, getIntensityOptions, type ActivityForm } from "./types";

interface ActivityDescriptionSectionProps {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
  instructorsList: { id: string; name: string }[];
}

export function ActivityDescriptionSection({ form, setForm, instructorsList }: ActivityDescriptionSectionProps) {
  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-emerald-700">Nom</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Vinyasa Flow" />
          </div>
          <div>
            <Label className="text-emerald-700">Description courte</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Résumé affiché sur la carte..." />
          </div>
          <div>
            <Label className="text-emerald-700">Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-emerald-700">Intensité</Label>
            <Select value={form.intensity} onValueChange={v => setForm({ ...form, intensity: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {getIntensityOptions(form.category).map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-emerald-700">Intervenant</Label>
            {instructorsList.length > 0 ? (
              <Select value={form.instructor} onValueChange={v => setForm({ ...form, instructor: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {instructorsList.map(i => <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} />
            )}
          </div>
          <div>
            <Label className="text-emerald-700">Image principale</Label>
            <div className="flex items-center gap-3 mt-1.5">
              {form.image && <img src={form.image} alt="Preview" className="h-14 w-14 rounded-lg object-cover" />}
              <Input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const ext = file.name.split(".").pop();
                const path = `activities/${Date.now()}.${ext}`;
                const { error } = await supabase.storage.from("activity-images").upload(path, file);
                if (!error) {
                  const { data: urlData } = supabase.storage.from("activity-images").getPublicUrl(path);
                  setForm(prev => ({ ...prev, image: urlData.publicUrl }));
                }
              }} className="text-xs" />
              {form.image && (
                <Button type="button" variant="link" size="sm" className="text-xs text-destructive p-0 h-auto" onClick={() => setForm(prev => ({ ...prev, image: "" }))}>×</Button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-emerald-700">Photos supplémentaires (max 5)</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {(form.images || []).map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img} alt={`Photo ${idx + 1}`} className="h-14 w-14 rounded-lg object-cover" />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                  >×</button>
                </div>
              ))}
              {(form.images || []).length < 5 && (
                <label className="h-14 w-14 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <Input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const ext = file.name.split(".").pop();
                    const path = `activities/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
                    const { error } = await supabase.storage.from("activity-images").upload(path, file);
                    if (!error) {
                      const { data: urlData } = supabase.storage.from("activity-images").getPublicUrl(path);
                      setForm(prev => ({ ...prev, images: [...(prev.images || []), urlData.publicUrl] }));
                    }
                  }} />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-emerald-700">Fiche produit (description longue)</Label>
        <Textarea value={form.long_description} onChange={e => setForm({ ...form, long_description: e.target.value })} rows={5} placeholder="Description détaillée affichée dans les détails de l'activité..." />
      </div>
    </div>
  );
}
