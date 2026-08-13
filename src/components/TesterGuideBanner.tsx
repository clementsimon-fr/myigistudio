import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FlaskConical, Smartphone, CreditCard, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import InstallAppGuide from "@/components/InstallAppGuide";
import StepHeader from "@/components/StepHeader";

const DISMISS_KEY = "myigistudio_tester_guide_dismissed";

// Bandeau temporaire pour la phase de test publique : rappelle aux testeurs leur rôle et les 3
// étapes à suivre. À retirer (ou désactiver) une fois l'appli passée en production réelle.
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
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary-dark" />
              Bienvenue, testeur !
            </DialogTitle>
            <DialogDescription>
              MyIgiStudio prépare son lancement, et vous faites partie des personnes de
              confiance choisies pour l'essayer avant tout le monde. Votre rôle est simple :
              utiliser l'application comme vous le feriez normalement, et nous dire ce qui
              coince. Voici comment procéder, en 3 étapes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg border p-3 space-y-3">
              <StepHeader n={1} icon={Smartphone} title="Téléchargez l'application (facultatif)" />
              <InstallAppGuide />
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <StepHeader n={2} icon={CreditCard} title="Faites une réservation" />
              <p className="text-xs text-muted-foreground">
                Réservez un cours ou un atelier comme vous le feriez normalement. Au moment de
                payer, utilisez cette carte bancaire fictive — aucun vrai paiement ne sera
                prélevé :
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 font-mono text-xs">
                <p>Numéro : 4242 4242 4242 4242</p>
                <p>Date : n'importe quelle date future</p>
                <p>CVC : n'importe quel code à 3 chiffres</p>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <StepHeader n={3} icon={MessageCircle} title="Faites-nous vos retours" />
              <p className="text-xs text-muted-foreground">
                Un bug, une remarque, une idée ? Utilisez le bouton <strong>Feedback</strong> en
                bas de l'écran — c'est le plus rapide pour nous le faire remonter.
              </p>
            </div>
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
