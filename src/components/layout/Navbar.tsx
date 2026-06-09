import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, CalendarDays, CreditCard, LogOut, Settings, Home, ChevronRight } from "lucide-react";
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
        <Link to="/" className="flex flex-col leading-none">
          <span className="text-2xl font-display font-bold">
            <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
          </span>
          <span className="text-[10px] md:text-xs font-display font-semibold text-primary-dark/70 -mt-0.5">
            Yoga, Pilates & Poterie
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
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Mon espace</span>
                </button>
              )}

              {isAdminLike && !location.pathname.startsWith("/admin") && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/bonjour")}>
                  <Settings className="h-3.5 w-3.5" /> Espace admin
                </Button>
              )}

              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" /> Déconnexion
              </Button>
            </div>

            {/* Mobile: connected badge + logout */}
            <div className="md:hidden flex items-center gap-2">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace?section=reservations")}
                  className="flex items-center gap-1.5 bg-primary/15 text-primary-dark font-semibold px-3 py-2 rounded-full border-2 border-primary/30 text-xs min-h-[44px]"
                >
                  <User className="h-4 w-4" />
                  {currentProfile.name}
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">Mon espace</span>
                </button>
              )}
              {isAdminLike && (
                <button className="flex items-center gap-1 p-2 text-sm font-medium" onClick={() => setOpen(!open)} aria-label="Menu">
                  {open ? <X className="h-5 w-5" /> : <><Menu className="h-5 w-5" /> <span className="text-xs">Menu</span></>}
                </button>
              )}
              <button onClick={handleLogout} className="p-2 text-destructive" aria-label="Déconnexion">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          /* Visitor: encadré around login icon */
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/30 text-primary-dark min-h-[44px] px-4">
              <User className="h-4 w-4" />
              <span className="text-xs">Connexion</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile menu — only for admin-like users */}
      {open && isLoggedIn && isAdminLike && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          <Link to="/" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Accueil
            </Button>
          </Link>

          <Link to="/admin/bonjour" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              Espace admin
            </Button>
          </Link>

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