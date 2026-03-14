import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, CalendarDays, CreditCard, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Activités", to: "/" },
  { label: "Planning & réservation", to: "/calendrier" },
];

const mobileNavLinks: typeof navLinks = [];

const clientSections = [
  { label: "Réservations", to: "/mon-espace?section=reservations", icon: CalendarDays },
  { label: "Mes cartes Yoga", to: "/mon-espace?section=cartes", icon: CreditCard },
  { label: "Forum", to: "/mon-espace?section=communaute", icon: MessageSquare },
  { label: "Profil", to: "/mon-espace?section=profil", icon: User },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isClientSpace = location.pathname === "/mon-espace";

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-primary-dark">
            MyIgi<span className="text-primary">Studio</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted ${
                location.pathname === link.to
                  ? "text-primary-dark bg-muted"
                  : "text-foreground/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isClientSpace ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-dark" />
                  </div>
                  Mon espace
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {clientSections.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/login" className="flex items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm" className="gap-2">
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
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`block px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "text-primary-dark bg-muted"
                  : "text-foreground/70"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t flex flex-col gap-2">
            {isClientSpace ? (
              <>
                {clientSections.map((item) => (
                  <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
                <Link to="/login" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)}>
                <Button variant="ghost" className="w-full justify-start gap-2">
                  <User className="h-4 w-4" />
                  Connexion
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
