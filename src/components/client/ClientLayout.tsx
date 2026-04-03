import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, CreditCard, User, Home, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/contexts/DemoContext";

interface ClientLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navItems = [
  { label: "Réservations", icon: CalendarDays, section: "reservations" },
  { label: "Cartes Yoga", icon: CreditCard, section: "cartes" },
  { label: "Profil", icon: User, section: "profil" },
];

export default function ClientLayout({ children, title }: ClientLayoutProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentProfile, setCurrentProfile } = useDemoContext();
  const currentSection = searchParams.get("section") || "reservations";

  const handleNav = (item: typeof navItems[0]) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(`/mon-espace?section=${item.section}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-display font-bold text-primary-dark">
            Bonjour {currentProfile?.name || ""}
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs rounded-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => { setCurrentProfile(null); navigate("/"); }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs rounded-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Accueil
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation buttons */}
      <div className="sticky top-14 z-40 border-b bg-background">
        <div className="container py-2">
          <div className="flex flex-wrap gap-1.5">
            {navItems.map(item => (
              <Button
                key={item.label}
                variant={currentSection === item.section ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs rounded-full min-h-[44px] px-4"
                onClick={() => handleNav(item)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
