import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, X } from "lucide-react";

export interface ExtraParticipant {
  firstName: string;
  lastName: string;
}

interface AddParticipantProps {
  participants: ExtraParticipant[];
  onChange: (participants: ExtraParticipant[]) => void;
}

export default function AddParticipant({ participants, onChange }: AddParticipantProps) {
  const addParticipant = () => {
    onChange([...participants, { firstName: "", lastName: "" }]);
  };

  const removeParticipant = (idx: number) => {
    onChange(participants.filter((_, i) => i !== idx));
  };

  const updateParticipant = (idx: number, field: keyof ExtraParticipant, value: string) => {
    onChange(participants.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  return (
    <div className="rounded-lg bg-muted/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Participants supplémentaires</Label>
        <Button type="button" size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={addParticipant}>
          <UserPlus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>
      {participants.length > 0 && (
        <div className="space-y-2">
          {participants.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border bg-background p-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <Input
                  placeholder="Prénom"
                  value={p.firstName}
                  onChange={e => updateParticipant(idx, "firstName", e.target.value)}
                  className="h-8 text-xs"
                  required
                />
                <Input
                  placeholder="Nom"
                  value={p.lastName}
                  onChange={e => updateParticipant(idx, "lastName", e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeParticipant(idx)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            Les participants supplémentaires seront ajoutés comme « Invité » dans la liste des clients.
          </p>
        </div>
      )}
    </div>
  );
}