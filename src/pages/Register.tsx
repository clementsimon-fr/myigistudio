import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { makeTestIdentifier, makeSyntheticEmail } from "@/lib/client-name";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { signUpWithPassword } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [noEmailMode, setNoEmailMode] = useState(false);
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    if (password.trim().length < 6) {
      setError("Mot de passe : 6 caractères minimum.");
      return;
    }
    setSending(true);
    setError(null);

    if (noEmailMode) {
      if (!lastName.trim()) {
        setError("Le nom est requis en mode test.");
        setSending(false);
        return;
      }
      const syntheticEmail = makeSyntheticEmail(firstName, lastName);
      const { data, error } = await supabase.functions.invoke("create-guest-account", {
        body: { email: syntheticEmail, first_name: firstName.trim(), last_name: lastName.trim(), password: password.trim() },
      });
      if (error || !data?.user_id) {
        setError(error?.message || "Création du compte impossible");
        setSending(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: syntheticEmail, password: password.trim() });
      setSending(false);
      if (signInError) { setError(signInError.message); return; }
      navigate(returnTo || "/mon-espace", { replace: true });
      return;
    }

    if (!email.trim()) { setSending(false); return; }
    const { error, needsConfirmation } = await signUpWithPassword(email.trim(), password.trim(), { first_name: firstName.trim(), last_name: lastName.trim() });
    setSending(false);
    if (error) { setError(error); return; }
    if (needsConfirmation) setSent(true);
    else navigate(returnTo || "/mon-espace", { replace: true });
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
              Un email de confirmation vient d'être envoyé à <strong>{email}</strong>. Ouvrez-le pour finaliser votre compte{returnTo ? " et continuer votre réservation" : ""}.
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
                  <Input id="last_name" placeholder="Ex : Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} required={noEmailMode} />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={noEmailMode} required={!noEmailMode} className={noEmailMode ? "opacity-50" : ""} />
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={noEmailMode} onCheckedChange={(v) => setNoEmailMode(!!v)} />
                Pas d'email (mode test)
              </label>
              {noEmailMode && (
                <p className="text-xs text-muted-foreground">
                  Identifiant de connexion : <strong className="text-foreground">{makeTestIdentifier(firstName, lastName) || "PRENOMNOM"}</strong>
                </p>
              )}

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="6 caractères min." value={password} onChange={(e) => setPassword(e.target.value)} required />
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
