import { useEffect } from "react";

// Intercepte le bouton retour matériel du téléphone et le geste de swipe-back
// (les deux déclenchent l'événement "popstate") pendant qu'un flux multi-étapes
// est ouvert, pour revenir à l'étape précédente au lieu de quitter la page.
export function useBackNavigation(active: boolean, step: number | string, onBack: () => void) {
  useEffect(() => {
    if (!active) return;
    window.history.pushState({ __step: step }, "");

    const handlePopState = () => { onBack(); };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step]);
}
