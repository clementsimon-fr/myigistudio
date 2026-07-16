import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import type { ActivityForm } from "./types";

interface ActivityTarifSectionProps {
  form: ActivityForm;
  setForm: React.Dispatch<React.SetStateAction<ActivityForm>>;
}

export function ActivityTarifSection({ form, setForm }: ActivityTarifSectionProps) {
  const isYoga = form.category === "yoga";

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

        {isYoga ? (
          <>
            <div className="flex gap-2">
              <Button
                type="button" size="sm"
                variant={form.tariff_mode === "cours" ? "default" : "outline"}
                onClick={() => setForm({ ...form, tariff_mode: "cours", default_price: 0 })}
              >
                Cours
              </Button>
              <Button
                type="button" size="sm"
                variant={form.tariff_mode === "prix" ? "default" : "outline"}
                onClick={() => setForm({ ...form, tariff_mode: "prix" })}
              >
                Prix
              </Button>
            </div>
            {form.tariff_mode === "prix" ? (
              <div className="flex items-center gap-1.5">
                <Input type="number" className="w-[90px] h-9 text-sm" value={form.default_price}
                  onChange={e => setForm({ ...form, default_price: Number(e.target.value) })} placeholder="Prix" />
                <span className="text-sm text-muted-foreground">€ — le client paie ce montant, sans passer par les cartes yoga.</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                1 cours par événement — le client paie avec une carte yoga ou une carte à l'unité.
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Input type="number" className="w-[90px] h-9 text-sm" value={form.default_price}
                onChange={e => setForm({ ...form, default_price: Number(e.target.value) })} placeholder="Prix" />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground -mt-2">
          Le contenu inclus dans le prix se configure dans la rubrique « Modalités ».
        </p>
      </div>
    </div>
  );
}
