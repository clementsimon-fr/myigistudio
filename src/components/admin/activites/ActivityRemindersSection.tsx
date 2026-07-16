import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, MapPin } from "lucide-react";
import { TemplateEditor } from "./TemplateEditor";
import { MODALITIES_VARIABLES, type ActivityForm } from "./types";

interface ActivityRemindersSectionProps {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
}

export function ActivityRemindersSection({ form, setForm }: ActivityRemindersSectionProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Ces informations s'appliquent à tous les événements de cette activité.
      </p>

      <div className="border rounded-lg p-5 space-y-2 bg-card shadow-sm">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <FileText className="h-4 w-4 text-primary" /> Infos complémentaires
        </Label>
        <Textarea
          value={form.default_complementary_info}
          onChange={e => setForm({ ...form, default_complementary_info: e.target.value })}
          rows={4}
          placeholder="Ex : Prévoir des vêtements confortables, apporter un tapis..."
          className="text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Informations supplémentaires visibles lors de la réservation.
        </p>
      </div>

      <div className="border rounded-lg p-5 space-y-2 bg-card shadow-sm">
        <Label className="flex items-center gap-1.5 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Les consignes</Label>
        <TemplateEditor value={form.default_modalities} onChange={v => setForm(prev => ({ ...prev, default_modalities: v }))} variables={MODALITIES_VARIABLES} rows={5} />
        <p className="text-[11px] text-muted-foreground">
          Adresse, consignes pratiques : visible par le client dans son espace après réservation.
        </p>
      </div>
    </div>
  );
}
