import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { identifierToSyntheticEmail } from "@/lib/client-name";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { session, isAdmin, loading, signInWithPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !session) return;
    navigate(returnTo || (isAdmin ? "/admin/planning" : "/mon-espace"), { replace: true });
  }, [loading, session, isAdmin, returnTo, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    // Comptes de test sans email : identifiant PRENOMNOM au lieu d'un email réel.
    const loginEmail = email.includes("@") ? email.trim() : identifierToSyntheticEmail(email.trim());
    const { error } = await signInWithPassword(loginEmail, password);
    setSending(false);
    if (error) setError(error);
  };

  const handleForgotPassword = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError("Entrez votre email ci-dessus, puis cliquez sur « Mot de passe oublié ? ».");
      return;
    }
    setSending(true);
    setError(null);
    const { error } = await resetPassword(email.trim());
    setSending(false);
    if (error) setError(error);
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-display font-bold">
            <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-foreground">Se connecter</h1>
          {returnTo && (
            <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour finaliser votre réservation</p>
          )}
        </div>

        {resetSent ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center space-y-2">
            <CheckCircle2 className="h-6 w-6 text-primary-dark mx-auto" />
            <p className="text-sm text-foreground">
              Un email pour réinitialiser votre mot de passe vient d'être envoyé à <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                required
                placeholder="votre@email.com ou PRENOMNOM (mode test)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                required
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline"
            >
              Mot de passe oublié ?
            </button>
          </form>
        )}

        <div className="mt-6 space-y-3">
          <Link to="/register">
            <Button type="button" variant="outline" className="w-full">
              Créer un compte
            </Button>
          </Link>
          <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
