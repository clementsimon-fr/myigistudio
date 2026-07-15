import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import type { ActivityForm } from "./types";

interface ActivityTarifSectionProps {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
}

export function ActivityTarifSection({ form, setForm }: ActivityTarifSectionProps) {
  return (
    <div className="space-y-5">
      <div className="border rounded-lg p-4 bg-card space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-emerald-700" />
          <Label className="text-emerald-700 mb-0">Tarif appliqué à tous les événements</Label>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Le tarif défini ici s'applique à tous les événements de cette activité (planning, réservation). Modifier ici met à jour partout.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Input type="number" className="w-[90px] h-9 text-sm" value={form.default_price}
              onChange={e => setForm({ ...form, default_price: Number(e.target.value) })} placeholder="Prix" />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex items-center gap-1.5">
            <Input type="number" className="w-[70px] h-9 text-sm" value={form.default_card_yoga_count}
              onChange={e => setForm({ ...form, default_card_yoga_count: Number(e.target.value) })} min={0} />
            <span className="text-sm text-muted-foreground">carte{form.default_card_yoga_count > 1 ? "s" : ""} yoga</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Le contenu inclus dans le prix se configure dans la rubrique « Modalités ».
        </p>
      </div>
    </div>
  );
}
