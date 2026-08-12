import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "myigistudio_tester_guide_dismissed";

// Bandeau temporaire pour la phase de test publique : rappelle aux testeurs
// que les paiements sont fictifs et où donner leur feedback. À retirer (ou
// désactiver) une fois l'appli passée en production réelle.
export default function TesterGuideBanner() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) !== "1") {
      setOpen(true);
    }
  }, []);

  // Élodie et les futurs admins ont leurs propres consignes, pas besoin du bandeau ici.
  if (location.pathname.startsWith("/admin")) return null;

  const handleDontShowAgain = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary-dark text-primary-dark-foreground text-xs sm:text-sm font-medium py-2 px-4 hover:opacity-90 transition-opacity"
      >
        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        Version de test — Consignes aux testeurs (cliquez ici)
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary-dark" />
              Consignes aux testeurs
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur une version de test de MyIgiStudio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p>
              Faites une réservation comme vous le feriez normalement. Pour
              payer, utilisez cette carte bancaire fictive — aucun vrai
              paiement ne sera prélevé :
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 font-mono text-xs">
              <p>Numéro : 4242 4242 4242 4242</p>
              <p>Date : n'importe quelle date future</p>
              <p>CVC : n'importe quel code à 3 chiffres</p>
            </div>
            <p>
              Un bug, une remarque, une idée ? Utilisez le bouton{" "}
              <strong>Feedback</strong> en bas de l'écran, c'est le plus
              rapide pour nous le faire remonter.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleDontShowAgain}>
              Ne plus afficher automatiquement
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              J'ai compris
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
