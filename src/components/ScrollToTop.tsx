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
  return null;
}
