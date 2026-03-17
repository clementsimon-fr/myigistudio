import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

interface SignupBlockProps {
  onSubmit: (name: string) => void;
  onBack: () => void;
  registering: boolean;
}

export default function SignupBlock({ onSubmit, onBack, registering }: SignupBlockProps) {
  const [name, setName] = useState("");

  if (registering) {
    return (
      <div className="max-w-md mx-auto">
        <div className="rounded-xl border bg-card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 text-primary-dark animate-pulse" />
          </div>
          <h2 className="text-lg font-display font-semibold text-primary-dark">
            Création de votre compte...
          </h2>
          <p className="text-sm text-muted-foreground">Envoi du mail de confirmation en cours</p>
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-display font-semibold text-primary-dark">Créer un compte</h2>
        <p className="text-sm text-muted-foreground mt-1">Saisissez votre prénom pour commencer</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()); }} className="space-y-3">
        <div>
          <Label htmlFor="signup-name">Prénom</Label>
          <Input id="signup-name" placeholder="Ex : Marc" value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>
        <div>
          <Label htmlFor="signup-last" className="text-muted-foreground">Nom</Label>
          <Input id="signup-last" placeholder="Nom" disabled className="opacity-50" />
        </div>
        <div>
          <Label htmlFor="signup-email" className="text-muted-foreground">Email</Label>
          <Input id="signup-email" placeholder="email@exemple.com" disabled className="opacity-50" />
        </div>
        <div>
          <Label htmlFor="signup-phone" className="text-muted-foreground">Téléphone</Label>
          <Input id="signup-phone" placeholder="06 00 00 00 00" disabled className="opacity-50" />
        </div>
        <div>
          <Label htmlFor="signup-pass" className="text-muted-foreground">Mot de passe</Label>
          <Input id="signup-pass" type="password" placeholder="••••••••" disabled className="opacity-50" />
        </div>
        <Button type="submit" className="w-full">Créer mon compte</Button>
        <Button type="button" variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
          Connexion Google
        </Button>
      </form>
      <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
        ← Retour
      </button>
    </div>
  );
}
