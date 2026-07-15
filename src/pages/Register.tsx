import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { signInWithOtp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;
    setSending(true);
    setError(null);
    const { error } = await signInWithOtp(email.trim(), { first_name: firstName.trim(), last_name: lastName.trim() });
    setSending(false);
    if (error) setError(error);
    else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-display font-bold">
            <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Créez votre compte</p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
            <CheckCircle2 className="h-6 w-6 text-primary-dark mx-auto" />
            <p className="text-sm text-foreground">
              Un lien de connexion vient d'être envoyé à <strong>{email}</strong>. Ouvrez-le pour finaliser votre compte{returnTo ? " et continuer votre réservation" : ""}.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input id="first_name" placeholder="Ex : Marc" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
                </div>
                <div>
                  <Label htmlFor="last_name">Nom</Label>
                  <Input id="last_name" placeholder="Ex : Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer mon compte"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link to={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} className="text-primary-dark font-medium hover:underline">
                Se connecter
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
