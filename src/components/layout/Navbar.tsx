import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, CalendarDays, CreditCard, LogOut, Compass, Calendar, Settings, BookOpen } from "lucide-react";
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

const studioSections = [
  { label: "Activités", to: "/", icon: Compass },
  { label: "Planning", to: "/?view=planning", icon: Calendar },
];

const adminSections = [
  { label: "Activités et réservations", to: "/admin/activites", icon: BookOpen },
  { label: "Paramètres", to: "/admin/parametres", icon: Settings },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentProfile, setCurrentProfile } = useDemoContext();
  const isLoggedIn = !!currentProfile;
  const isAdmin = currentProfile?.role === "admin";

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
            {/* Desktop: dropdown menu for logged-in users */}
            <div className="hidden md:flex items-center gap-3">
              {/* Admin quick link */}
              {(isAdmin || currentProfile?.role === "fournisseur") && !location.pathname.startsWith("/admin") && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/bonjour")}>
                  <Settings className="h-3.5 w-3.5" /> Espace admin
                </Button>
              )}
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
                  {(isAdmin || currentProfile?.role === "fournisseur") && (
                    <>
                      <p className="px-2 py-1.5 text-xs text-muted-foreground font-normal">Administration</p>
                      {adminSections.map((item) => (
                        <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)} className="flex items-center gap-2 cursor-pointer">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {currentProfile.role === "client" && (
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
                  <p className="px-2 py-1.5 text-xs text-muted-foreground font-normal">IgiStudio</p>
                  {studioSections.map((item) => (
                    <DropdownMenuItem key={item.to} onClick={() => navigate(item.to)} className="flex items-center gap-2 cursor-pointer">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
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

            {/* Mobile: hamburger for logged-in users */}
            <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </>
        ) : (
          /* Visitor: icon-only login button */
          <Link to="/login">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile menu — only for logged-in users */}
      {open && isLoggedIn && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          <p className="text-xs text-muted-foreground px-2 mb-1">Connecté : {currentProfile.name}</p>
          
          {isAdmin && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-2 font-semibold">Administration</p>
              {adminSections.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </>
          )}

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
            </>
          )}

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pt-2 font-semibold">IgiStudio</p>
          {studioSections.map((item) => (
            <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}

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
