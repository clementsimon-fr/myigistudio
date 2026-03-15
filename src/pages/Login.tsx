import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User, UserPlus, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";

const PROFILE_CARDS = [
  { id: "elodie", name: "Élodie", subtitle: "Administratrice", icon: Shield, defaultNavigateTo: "/admin/reservations", supportsReturn: false },
  { id: "marion", name: "Marion", subtitle: "Nouvelle cliente", icon: UserPlus, defaultNavigateTo: "/mon-espace", supportsReturn: true },
  { id: "sophie", name: "Sophie", subtitle: "Cliente existante", icon: User, defaultNavigateTo: "/mon-espace", supportsReturn: true },
  { id: "visitor", name: "Visiteur", subtitle: "Déconnexion", icon: Eye, defaultNavigateTo: "/", supportsReturn: false },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { setCurrentProfile, getDefaultProfile, tempProfiles } = useDemoContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);

  const allProfiles = [
    { id: "elodie", name: "Élodie", email: "elodie@myigistudio.fr" },
    { id: "sophie", name: "Sophie", email: "sophie@email.fr" },
    { id: "marion", name: "Marion", email: "marion@email.fr" },
    ...tempProfiles.map(p => ({ id: p.id, name: p.name, email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@email.fr` })),
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    const match = allProfiles.find(
      p => p.email.toLowerCase() === trimmed || p.name.toLowerCase() === trimmed
    );
    if (match) {
      const tp = tempProfiles.find(p => p.id === match.id);
      if (tp) {
        setCurrentProfile(tp);
        navigate(returnTo || "/mon-espace");
      } else {
        const card = PROFILE_CARDS.find(c => c.id === match.id);
        const profile = getDefaultProfile(match.id);
        if (profile && card) {
          setCurrentProfile(profile);
          navigate(card.supportsReturn && returnTo ? returnTo : card.defaultNavigateTo);
        }
      }
    } else {
      setError("Aucun compte trouvé avec cet identifiant.");
    }
  };

  const handleQuickSelect = (card: typeof PROFILE_CARDS[0]) => {
    if (card.id === "visitor") {
      setCurrentProfile(null);
      navigate(card.defaultNavigateTo);
    } else {
      const profile = getDefaultProfile(card.id);
      if (profile) setCurrentProfile(profile);
      navigate(card.supportsReturn && returnTo ? returnTo : card.defaultNavigateTo);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-display font-bold text-primary-dark">
            MyIgi<span className="text-primary italic">Studio</span>
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-foreground">Se connecter</h1>
          {returnTo && (
            <p className="mt-1 text-sm text-muted-foreground">Connectez-vous pour finaliser votre réservation</p>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email ou nom</Label>
            <Input
              id="email"
              type="text"
              placeholder="sophie@email.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full">Se connecter</Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            to={`/register${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Pas encore de compte ? Créer un compte →
          </Link>
        </div>

        {/* Discrete demo section */}
        <div className="mt-8 border-t pt-4">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mx-auto transition-colors"
          >
            Accès rapide démo
            {showDemo ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showDemo && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {PROFILE_CARDS.map(card => (
                <button
                  key={card.id}
                  onClick={() => handleQuickSelect(card)}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <card.icon className="h-3 w-3" />
                  {card.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
