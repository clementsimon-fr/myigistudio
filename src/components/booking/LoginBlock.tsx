import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { DemoProfile, useDemoContext } from "@/contexts/DemoContext";

interface LoginBlockProps {
  onSelect: (profile: DemoProfile) => void;
  onBack: () => void;
}

const CLIENT_DEFAULTS = [
  { id: "marion", name: "Marion", subtitle: "Nouvelle cliente" },
  { id: "sophie", name: "Sophie", subtitle: "Cliente existante (4 crédits)" },
];

export default function LoginBlock({ onSelect, onBack }: LoginBlockProps) {
  const { getDefaultProfile, tempProfiles } = useDemoContext();

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-display font-semibold text-primary-dark">Se connecter</h2>
        <p className="text-sm text-muted-foreground mt-1">Choisissez votre compte</p>
      </div>

      <div className="space-y-2">
        {CLIENT_DEFAULTS.map(card => {
          const profile = getDefaultProfile(card.id);
          return (
            <button
              key={card.id}
              onClick={() => profile && onSelect(profile)}
              className="w-full flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{card.name}</p>
                <p className="text-sm text-muted-foreground">{card.subtitle}</p>
              </div>
            </button>
          );
        })}

        {tempProfiles.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className="w-full flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <User className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{p.name}</p>
              <p className="text-sm text-muted-foreground">Cliente</p>
            </div>
          </button>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full opacity-50 cursor-not-allowed" disabled>
        Connexion Google
      </Button>

      <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2">
        ← Retour
      </button>
    </div>
  );
}
