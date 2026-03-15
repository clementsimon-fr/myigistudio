import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, User, UserPlus, Eye } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";

const PROFILE_CARDS = [
  {
    id: "elodie",
    name: "Élodie",
    subtitle: "Administratrice",
    icon: Shield,
    description: "Gère le studio, les cours et les réservations",
    navigateTo: "/admin/reservations",
    accent: "bg-primary-dark text-primary-dark-foreground",
  },
  {
    id: "marion",
    name: "Marion",
    subtitle: "Nouvelle cliente",
    icon: UserPlus,
    description: "0 crédit · Pas encore de carte",
    navigateTo: "/mon-espace",
    accent: "bg-secondary text-secondary-foreground",
  },
  {
    id: "sophie",
    name: "Sophie",
    subtitle: "Cliente existante",
    icon: User,
    description: "4 crédits · Carte 10 cours active",
    navigateTo: "/mon-espace",
    accent: "bg-primary text-primary-foreground",
  },
  {
    id: "visitor",
    name: "Visiteur",
    subtitle: "Déconnexion",
    icon: Eye,
    description: "Parcourir le site sans profil",
    navigateTo: "/",
    accent: "bg-muted text-muted-foreground",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { setCurrentProfile, getDefaultProfile } = useDemoContext();

  const handleSelect = (card: typeof PROFILE_CARDS[0]) => {
    if (card.id === "visitor") {
      setCurrentProfile(null);
    } else {
      const profile = getDefaultProfile(card.id);
      if (profile) setCurrentProfile(profile);
    }
    navigate(card.navigateTo);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-display font-bold text-primary-dark">
            MyIgi<span className="text-primary italic">Studio</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Choisissez un profil de démonstration</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROFILE_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => handleSelect(card)}
              className="rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:border-primary-dark/30 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className={`h-10 w-10 rounded-lg ${card.accent} flex items-center justify-center mb-3`}>
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-primary-dark">{card.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-2">{card.description}</p>
            </button>
          ))}
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
