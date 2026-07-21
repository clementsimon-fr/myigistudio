import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Sans ça, revenir en arrière depuis l'espace client vers l'accueil garde le scroll
// de la page précédente : la nouvelle page se retrouve affichée au milieu, avec la
// barre de filtres collante (sticky) qui chevauche le bouton Connexion de la Navbar.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Le swipe-back natif iOS Safari restaure la page depuis le bfcache (snapshot figé)
  // au lieu de rejouer une navigation React normale : l'effet ci-dessus ne se redéclenche
  // pas dans ce cas précis, donc le scroll figé de l'ancienne page reste affiché avec le
  // même chevauchement. "pageshow" + event.persisted est le signal standard pour détecter
  // une restauration bfcache et forcer le même correctif.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.scrollTo(0, 0);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
