import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GuestFormProps {
  onSubmit: (name: string) => void;
  onBack: () => void;
}

export default function GuestForm({ onSubmit, onBack }: GuestFormProps) {
  const [name, setName] = useState("");

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-display font-semibold text-primary-dark">Continuer sans compte</h2>
        <p className="text-sm text-muted-foreground mt-1">Saisissez votre prénom pour poursuivre</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }} className="space-y-3">
        <div>
          <Label htmlFor="guest-name">Prénom</Label>
          <Input id="guest-name" placeholder="Ex : Marc" value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <Label htmlFor="guest-last" className="text-muted-foreground">Nom</Label>
          <Input id="guest-last" placeholder="Nom" disabled className="opacity-50" />
        </div>
        <div>
          <Label htmlFor="guest-email" className="text-muted-foreground">Email</Label>
          <Input id="guest-email" placeholder="email@exemple.com" disabled className="opacity-50" />
        </div>
        <div>
          <Label htmlFor="guest-phone" className="text-muted-foreground">Téléphone</Label>
          <Input id="guest-phone" placeholder="06 00 00 00 00" disabled className="opacity-50" />
        </div>
        <Button type="submit" className="w-full">Continuer</Button>
      </form>
      <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
        ← Retour
      </button>
    </div>
  );
}
