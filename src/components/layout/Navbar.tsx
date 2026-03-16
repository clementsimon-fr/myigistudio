import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, CalendarDays, CreditCard, LogOut, RefreshCw, Compass, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useDemoContext } from "@/contexts/DemoContext";

const clientSections = [
  { label: "Réservations", to: "/mon-espace?section=reservations", icon: CalendarDays },
  { label: "Mes cartes Yoga", to: "/mon-espace?section=cartes", icon: CreditCard },
  { label: "Profil", to: "/mon-espace?section=profil", icon: User },
];

const studioSections = [
  { label: "Activités", to: "/", icon: Compass },
  { label: "Planning", to: "/?view=planning", icon: Calendar },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile, setCurrentProfile } = useDemoContext();
  const isLoggedIn = !!currentProfile;

  const handleLogout = () => {
    setCurrentProfile(null);
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-primary-dark">
            MyIgi<span className="text-primary">Studio</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="default" className="gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-dark" />
                  </div>
                  {currentProfile.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {currentProfile.role === "client" && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Mon espace</DropdownMenuLabel>
                    {clientSections.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">IgiStudio</DropdownMenuLabel>
                    {studioSections.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/login" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Changer de profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="default" size="default" className="gap-2">
                <User className="h-4 w-4" />
                Connexion
              </Button>
            </Link>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          {isLoggedIn ? (
            <>
              <p className="text-xs text-muted-foreground px-2 mb-1">Connecté : {currentProfile.name}</p>
              {currentProfile.role === "client" && (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-2 font-semibold">Mon espace</p>
                  {clientSections.map((item) => (
                    <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-2 font-semibold">IgiStudio</p>
                  {studioSections.map((item) => (
                    <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </>
              )}
              <div className="pt-2 border-t space-y-1">
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Changer de profil
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={() => { handleLogout(); setOpen(false); }}>
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </>
          ) : (
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button variant="default" className="w-full justify-center gap-2">
                <User className="h-4 w-4" />
                Connexion
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
