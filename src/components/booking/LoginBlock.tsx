import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { identifierToSyntheticEmail } from "@/lib/client-name";

interface LoginBlockProps {
  onBack: () => void;
}

export default function LoginBlock({ onBack }: LoginBlockProps) {
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    const loginEmail = email.includes("@") ? email.trim() : identifierToSyntheticEmail(email.trim());
    const { error } = await signInWithPassword(loginEmail, password);
    setSending(false);
    if (error) setError(error);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Connectez-vous pour continuer votre réservation.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="text"
          required
          placeholder="votre@email.com ou PRENOMNOM (mode test)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <Input
          type="password"
          required
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
        </Button>
      </form>
      <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2">
        ← Retour
      </button>
    </div>
  );
}
