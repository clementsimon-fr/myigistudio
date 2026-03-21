import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shield, User, UserPlus, Eye, Wrench } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";

const PROFILE_CARDS = [
  { id: "fournisseur", name: "Fournisseur", subtitle: "Accès complet", icon: Wrench, defaultNavigateTo: "/admin/bonjour", supportsReturn: false },
  { id: "elodie", name: "Élodie", subtitle: "Administratrice", icon: Shield, defaultNavigateTo: "/admin/bonjour", supportsReturn: false },
];

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { setCurrentProfile, getDefaultProfile, tempProfiles } = useDemoContext();

  const handleSelect = (card: typeof PROFILE_CARDS[0]) => {
    const profile = getDefaultProfile(card.id);
    if (profile) setCurrentProfile(profile);
    navigate(card.supportsReturn && returnTo ? returnTo : card.defaultNavigateTo);
  };

  const handleTempSelect = (profile: typeof tempProfiles[0]) => {
    setCurrentProfile(profile);
    navigate(returnTo || "/mon-espace");
  };

  const handleVisitor = () => {
    setCurrentProfile(null);
    navigate("/");
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

        <div className="space-y-2">
          {PROFILE_CARDS.map(card => (
            <button
              key={card.id}
              onClick={() => handleSelect(card)}
              className="w-full flex items-center gap-3 rounded-lg border bg-card p-4 text-left hover:border-primary/40 hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{card.name}</p>
                <p className="text-sm text-muted-foreground">{card.subtitle}</p>
              </div>
            </button>
          ))}

          {tempProfiles.map(p => (
            <button
              key={p.id}
              onClick={() => handleTempSelect(p)}
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

        <div className="mt-4 space-y-3">
          <button
            onClick={handleVisitor}
            className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <Eye className="h-4 w-4" />
            Continuer en tant que visiteur
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
