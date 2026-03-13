import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary-dark text-primary-dark-foreground">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl font-display font-bold mb-3">
            MyIgi<span className="text-secondary">Studio</span>
          </h3>
          <p className="text-sm opacity-80 leading-relaxed">
            Yoga, Pilates, Poterie & Bien-être. Un lieu unique pour prendre soin de soi.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-70">Navigation</h4>
          <div className="space-y-2 text-sm">
            <Link to="/" className="block opacity-80 hover:opacity-100 transition-opacity">Activités</Link>
            <Link to="/calendrier" className="block opacity-80 hover:opacity-100 transition-opacity">Planning & réservation</Link>
            <Link to="/login" className="block opacity-80 hover:opacity-100 transition-opacity">Mon Espace</Link>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-70">Contact</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 opacity-80">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>123 Rue du Studio, Ville</span>
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <Phone className="h-4 w-4 shrink-0" />
              <span>01 23 45 67 89</span>
            </div>
            <div className="flex items-center gap-2 opacity-80">
              <Mail className="h-4 w-4 shrink-0" />
              <span>contact@igistudio.fr</span>
            </div>
            <a href="#" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <Instagram className="h-4 w-4 shrink-0" />
              <span>@igistudio</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container py-4 text-center text-xs opacity-60">
          © 2026 IgiStudio. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
