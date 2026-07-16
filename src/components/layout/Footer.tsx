import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary-dark text-primary-dark-foreground">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo-igistudio.jpg" alt="Igi Studio" className="h-9 w-9 rounded-full object-cover shrink-0" />
            <h3 className="text-xl font-display font-bold">
              <span className="text-brand-pink">My</span><span className="text-white">IgiStudio</span>
            </h3>
          </div>
          <p className="text-sm opacity-80 leading-relaxed">
            Yoga, Pilates & Poterie. Un lieu unique pour prendre soin de soi.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-70">Contact</h4>
          <div className="space-y-2 text-sm">
            <a
              href="https://www.google.com/maps/place//data=!4m2!3m1!1s0x478b2f719c9d09ad:0x518d02c538663fba?sa=X&ved=1t:8290&ictx=111"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity"
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span>4 rue Joseph Seigner, 38300 Bourgoin-Jallieu</span>
            </a>
            <a href="tel:0662299213" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <Phone className="h-4 w-4 shrink-0" />
              <span>06 62 29 92 13</span>
            </a>
            <a href="mailto:igistudiofr@gmail.com" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <Mail className="h-4 w-4 shrink-0" />
              <span>igistudiofr@gmail.com</span>
            </a>
            <a href="https://www.instagram.com/_igistudio_/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <Instagram className="h-4 w-4 shrink-0" />
              <span>@_igistudio_</span>
            </a>
            <a href="https://www.facebook.com/p/Igi-Studio-100086421016120/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <Facebook className="h-4 w-4 shrink-0" />
              <span>Igi Studio</span>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10">
        <div className="container py-4 text-center text-xs opacity-60 space-y-1">
          <div>© 2026 IgiStudio. Tous droits réservés.</div>
          <div>
            <a href="https://www.igistudio.fr/mentions-l%C3%A9gales-et-cgv" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 underline">
              Mentions légales
            </a>
          </div>
          <div>Développé avec passion par MyAppFlow</div>
        </div>
      </div>
    </footer>
  );
}
