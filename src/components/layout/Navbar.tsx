import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Accueil", to: "/" },
  { label: "Yoga & Pilates", to: "/yoga" },
  { label: "Poterie", to: "/poterie" },
  { label: "Ateliers", to: "/ateliers" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-display font-bold text-primary-dark">
            MyIgi<span className="text-primary">Studio</span>
          </span>
        </Link>

        {/* Desktop links */}
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

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              Connexion
            </Button>
          </Link>
          <Link to="/reserver">
            <Button size="sm" className="bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90">
              Réserver
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
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
            <Link to="/login" onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <User className="h-4 w-4" />
                Connexion
              </Button>
            </Link>
            <Link to="/reserver" onClick={() => setOpen(false)}>
              <Button className="w-full bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90">
                Réserver
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
