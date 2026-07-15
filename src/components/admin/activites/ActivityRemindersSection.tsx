import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Info, FileText, MapPin, Clock, Mail } from "lucide-react";
import { TemplateEditor } from "./TemplateEditor";
import { REMINDER_VARIABLES, MODALITIES_VARIABLES, REMINDER_TIMINGS, type ActivityForm } from "./types";

interface ActivityRemindersSectionProps {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
}

export function ActivityRemindersSection({ form, setForm }: ActivityRemindersSectionProps) {
  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-5 space-y-5 bg-card">
        <p className="text-xs text-muted-foreground">
          Ces informations s'appliquent à tous les événements de cette activité.
        </p>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Info className="h-4 w-4 text-primary" /> Ce qui est inclus dans le prix
          </Label>
          <Textarea
            value={form.default_inclusions}
            onChange={e => setForm({ ...form, default_inclusions: e.target.value })}
            rows={2}
            placeholder="Ex : le goûter est compris, matériel fourni..."
            className="text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            S'affiche à côté du prix lors de la réservation.
          </p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" /> Infos complémentaires
          </Label>
          <Textarea
            value={form.default_complementary_info}
            onChange={e => setForm({ ...form, default_complementary_info: e.target.value })}
            rows={2}
            placeholder="Ex : Prévoir des vêtements confortables, apporter un tapis..."
            className="text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Informations supplémentaires visibles lors de la réservation.
          </p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label className="flex items-center gap-1.5 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Les consignes</Label>
          <TemplateEditor value={form.default_modalities} onChange={v => setForm(prev => ({ ...prev, default_modalities: v }))} variables={MODALITIES_VARIABLES} />
          <p className="text-[11px] text-muted-foreground">
            Adresse, consignes pratiques : visible par le client dans son espace après réservation.
          </p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <Label className="flex items-center gap-1.5 text-sm font-medium"><Mail className="h-4 w-4 text-primary" /> Message avant le cours</Label>
          <TemplateEditor value={form.default_reminder} onChange={v => setForm(prev => ({ ...prev, default_reminder: v }))} variables={REMINDER_VARIABLES} showInsertModalities={true} />
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Timing d'envoi</Label>
            <div className="flex flex-wrap gap-1.5">
              {REMINDER_TIMINGS.map(t => {
                const timings = form.reminder_timing.split(",").filter(Boolean);
                const isActive = timings.includes(t.value);
                return (
                  <Button key={t.value} type="button" size="sm"
                    variant={isActive ? "default" : "outline"}
                    className="h-7 text-xs px-3"
                    onClick={() => {
                      const newTimings = isActive
                        ? timings.filter(v => v !== t.value)
                        : [...timings, t.value];
                      setForm(prev => ({ ...prev, reminder_timing: newTimings.filter(Boolean).join(",") || "1j" }));
                    }}>
                    {t.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sélectionnez quand envoyer ce message avant l'événement.
          </p>
        </div>
      </div>
    </div>
  );
}
