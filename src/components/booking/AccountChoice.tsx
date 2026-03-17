import { Button } from "@/components/ui/button";
import { LogIn, UserPlus, User } from "lucide-react";

interface AccountChoiceProps {
  onLogin: () => void;
  onRegister: () => void;
  onGuest: () => void;
}

export default function AccountChoice({ onLogin, onRegister, onGuest }: AccountChoiceProps) {
  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
        <User className="h-7 w-7 text-primary-dark" />
      </div>
      <div>
        <h2 className="text-lg font-display font-semibold text-primary-dark">
          Comment souhaitez-vous continuer ?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connectez-vous pour accéder à vos cartes et vos réservations.
        </p>
      </div>
      <div className="grid gap-3 pt-2">
        <Button className="w-full gap-2" onClick={onLogin}>
          <LogIn className="h-4 w-4" /> Se connecter
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={onRegister}>
          <UserPlus className="h-4 w-4" /> Créer un compte
        </Button>
        <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={onGuest}>
          <User className="h-4 w-4" /> Continuer sans compte
        </Button>
      </div>
    </div>
  );
}
