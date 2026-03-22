import { useNavigate } from "react-router-dom";
import { CalendarDays, CreditCard, User, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/contexts/DemoContext";

interface ClientLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navItems = [
  { label: "Accueil", icon: Home, path: "/" },
  { label: "Réservations", icon: CalendarDays, section: "reservations" },
  { label: "Cartes Yoga", icon: CreditCard, section: "cartes" },
  { label: "Profil", icon: User, section: "profil" },
];

export default function ClientLayout({ children, title }: ClientLayoutProps) {
  const navigate = useNavigate();
  const { currentProfile, setCurrentProfile } = useDemoContext();

  const handleNav = (item: typeof navItems[0]) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (item.path) {
      navigate(item.path);
    } else if (item.section) {
      navigate(`/mon-espace?section=${item.section}`);
    }
  };

  const handleLogout = () => {
    setCurrentProfile(null);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-display font-bold text-primary-dark">{title}</h1>
          {currentProfile && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary-dark font-medium px-3 py-1.5 rounded-full">
                <User className="h-3.5 w-3.5" />
                {currentProfile.name}
                {currentProfile.credits > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {currentProfile.credits}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation buttons */}
      <div className="border-b bg-background">
        <div className="container py-2">
          <div className="flex flex-wrap gap-1.5">
            {navItems.map(item => (
              <Button
                key={item.label}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-full"
                onClick={() => handleNav(item)}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs rounded-full text-destructive border-destructive/30 hover:bg-destructive/10 ml-auto"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </Button>
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
