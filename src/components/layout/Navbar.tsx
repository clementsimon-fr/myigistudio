import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, CalendarDays, CreditCard, LogOut, Settings, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDemoContext } from "@/contexts/DemoContext";

const clientSections = [
  { label: "Réservations", to: "/mon-espace?section=reservations", icon: CalendarDays },
  { label: "Mes cartes Yoga", to: "/mon-espace?section=cartes", icon: CreditCard },
  { label: "Profil", to: "/mon-espace?section=profil", icon: User },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile, setCurrentProfile } = useDemoContext();
  const isLoggedIn = !!currentProfile;
  const isAdmin = currentProfile?.role === "admin";
  const isAdminLike = isAdmin || currentProfile?.role === "fournisseur";
  const isClient = currentProfile?.role === "client";

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

        {isLoggedIn ? (
          <>
            {/* Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace?section=reservations")}
                  className="flex items-center gap-1.5 bg-primary/15 text-primary-dark font-semibold px-4 py-2 rounded-full border-2 border-primary/30 hover:bg-primary/25 transition-colors text-sm"
                >
                  <User className="h-4 w-4" />
                  {currentProfile.name}
                </button>
              )}

              {isAdminLike && !location.pathname.startsWith("/admin") && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/bonjour")}>
                  <Settings className="h-3.5 w-3.5" /> Espace admin
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Menu className="h-4 w-4" />
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer">
                    <Home className="h-4 w-4" />
                    Accueil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />

                  {isAdminLike && (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/admin/bonjour")} className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4" />
                        Espace admin
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isClient && (
                    <>
                      <p className="px-2 py-1.5 text-xs text-muted-foreground font-normal">Mon espace</p>
                      {clientSections.map((item) => (
                        <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)} className="flex items-center gap-2 cursor-pointer">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-destructive cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile: connected icon that links to mon-espace + menu */}
            <div className="md:hidden flex items-center gap-2">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace?section=reservations")}
                  className="flex items-center gap-1 bg-primary/15 text-primary-dark font-semibold px-3 py-1.5 rounded-full border-2 border-primary/30 text-xs"
                >
                  <User className="h-3.5 w-3.5" />
                  {currentProfile.name}
                </button>
              )}
              <button className="flex items-center gap-1 p-2 text-sm font-medium" onClick={() => setOpen(!open)} aria-label="Menu">
                {open ? <X className="h-5 w-5" /> : <><Menu className="h-5 w-5" /> <span className="text-xs">Menu</span></>}
              </button>
            </div>
          </>
        ) : (
          /* Visitor: encadré around login icon */
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/30 text-primary-dark">
              <User className="h-4 w-4" />
              <span className="text-xs">Connexion</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile menu */}
      {open && isLoggedIn && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          <p className="text-xs text-muted-foreground px-2 mb-1">Connecté : {currentProfile.name}</p>

          <Link to="/" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Accueil
            </Button>
          </Link>

          {isAdminLike && (
            <Link to="/admin/bonjour" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                Espace admin
              </Button>
            </Link>
          )}

          {isClient && (
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
            </>
          )}

          <div className="pt-2 border-t space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive" onClick={() => { handleLogout(); setOpen(false); }}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
