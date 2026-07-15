import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface LoginBlockProps {
  onBack: () => void;
}

export default function LoginBlock({ onBack }: LoginBlockProps) {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    const { error } = await signInWithOtp(email.trim());
    setSending(false);
    if (error) setError(error);
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-2">
        <CheckCircle2 className="h-6 w-6 text-primary-dark mx-auto" />
        <p className="text-sm text-foreground">
          Un lien de connexion vient d'être envoyé à <strong>{email}</strong>. Ouvrez-le pour continuer votre réservation.
        </p>
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">Recevez un lien de connexion par email, sans mot de passe.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="email"
          required
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Recevoir un lien de connexion"}
        </Button>
      </form>
      <button onClick={onBack} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2">
        ← Retour
      </button>
    </div>
  );
}
