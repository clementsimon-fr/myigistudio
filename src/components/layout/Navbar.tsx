import { Link, useNavigate } from "react-router-dom";
import { User, ChevronRight, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { session, clientProfile, isAdmin: isAdminLike, signOut } = useAuth();
  const isLoggedIn = !!session;
  // Ne PAS exiger clientProfile ici : un profil manquant ou pas encore chargé (latence réseau,
  // ou trigger de création de profil qui a raté une fois — voir l'incident du 13/08/2026où 3
  // comptes s'étaient retrouvés sans fiche client_profiles) ne doit jamais faire disparaître
  // toute la navigation. Dès qu'une session existe et n'est pas identifiée comme staff, on
  // affiche le badge client (avec un nom de repli, voir displayName) plutôt que rien du tout.
  const isClient = isLoggedIn && !isAdminLike;
  const displayName = clientProfile?.first_name || clientProfile?.email || "Mon compte";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo-igistudio.jpg" alt="Igi Studio" className="h-10 w-10 rounded-full object-cover shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-display font-bold">
              <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
            </span>
            <span className="text-[10px] md:text-xs font-display font-semibold text-primary-dark/70 -mt-0.5">
              Yoga, Pilates & Poterie
            </span>
          </div>
        </Link>

        {isLoggedIn ? (
          <>
            {/* Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace")}
                  className="flex items-center gap-1.5 bg-primary/15 text-primary-dark font-semibold px-4 py-2 rounded-full border-2 border-primary/30 hover:bg-primary/25 transition-colors text-sm"
                >
                  <User className="h-4 w-4" />
                  {displayName}
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Mon espace</span>
                </button>
              )}

              {isAdminLike && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/planning")}>
                  <Settings className="h-3.5 w-3.5" /> Espace Admin
                </Button>
              )}

              {!isAdminLike && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="h-3.5 w-3.5" /> Déconnexion
                </Button>
              )}
            </div>

            {/* Mobile: connected badge + logout */}
            <div className="md:hidden flex items-center gap-2">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace")}
                  className="flex items-center gap-1.5 bg-primary/15 text-primary-dark font-semibold px-2.5 py-1.5 rounded-xl border-2 border-primary/30 min-h-[44px] max-w-[38vw]"
                >
                  <User className="h-4 w-4 shrink-0" />
                  {/* Prénom et "Mon espace" sur 2 lignes : à l'horizontale (comme sur desktop),
                      le bouton devenait trop large sur mobile et débordait à côté du logo. */}
                  <span className="flex flex-col items-start leading-tight min-w-0">
                    <span className="text-xs truncate max-w-full">{displayName}</span>
                    <span className="text-[10px] font-medium opacity-80">Mon espace</span>
                  </span>
                </button>
              )}
              {isAdminLike && (
                <button
                  onClick={() => navigate("/admin/planning")}
                  className="flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-2 min-h-[44px]"
                >
                  <Settings className="h-4 w-4" /> Espace Admin
                </button>
              )}
              {/* Déconnexion volontairement absente d'ici : sur mobile elle doit toujours être
                  tout en bas de l'écran, jamais dans la barre du haut — voir le bouton flottant
                  fixé en bas de page, plus bas dans ce composant. */}
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
    </nav>

    {/* Déconnexion (client, mobile) : bouton discret fixé tout en bas de l'écran — jamais en
        haut. Placé à gauche pour ne pas chevaucher le bouton Feedback (fixé en bas à droite).
        Volontairement SIBLING de <nav>, pas descendant : <nav> a backdrop-blur-md, et un
        ancêtre avec backdrop-filter/filter devient le containing block des enfants position:
        fixed dans Chrome — le bouton se retrouvait ancré au bas de la barre du haut (~64px)
        au lieu du bas du viewport. Bug vu en prod le 13/08/2026 (bouton flottant en haut). */}
    {isLoggedIn && isClient && (
      <button
        onClick={handleLogout}
        className="md:hidden fixed bottom-4 left-4 z-30 flex items-center gap-1.5 bg-card border text-destructive rounded-full px-3 py-2.5 shadow-lg text-xs font-medium"
      >
        <LogOut className="h-3.5 w-3.5" /> Déconnexion
      </button>
    )}
    </>
  );
}
