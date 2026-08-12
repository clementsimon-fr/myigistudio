import { useEffect, useState } from "react";
import { Info, Copy, Check, Mail, BellRing, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DISMISS_KEY = "myigistudio_admin_tester_info_dismissed";

// Message prêt à copier-coller pour inviter les testeurs — tenu à jour ici plutôt que par
// Élodie qui le recopierait à la main depuis un message à part.
const TESTER_MESSAGE = `Bonjour !

Vous êtes invité·e à tester la nouvelle application de réservation MyIgiStudio avant son lancement officiel.

Lien : https://myigistudio.vercel.app

Faites une réservation comme vous le feriez normalement (cours ou atelier), et payez avec cette carte bancaire fictive — aucun argent n'est prélevé :
Numéro : 4242 4242 4242 4242
Date : n'importe quelle date future
CVC : n'importe quel code à 3 chiffres

Vous pouvez aussi installer l'application sur votre téléphone (bandeau en haut du site, "Télécharger l'application").

Un bug, une remarque ? Utilisez le bouton "Feedback" en bas de l'écran sur le site — c'est le plus rapide pour nous le faire remonter.

Merci pour votre aide précieuse !`;

// Bandeau d'information pour Élodie (et tout futur admin) : explique le système de
// notifications, fournit le message à transmettre aux testeurs, et les prochaines étapes.
// Temporaire, pour la phase de test — à retirer une fois le lancement réel fait.
export default function AdminTesterInfoBanner() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) !== "1") {
      setOpen(true);
    }
  }, []);

  const handleDontShowAgain = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TESTER_MESSAGE);
      setCopied(true);
      toast({ title: "Message copié ✓" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Impossible de copier", description: "Sélectionnez le texte manuellement.", variant: "destructive" });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary-dark text-primary-dark-foreground text-xs sm:text-sm font-medium py-2 px-4 hover:opacity-90 transition-opacity"
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        Phase de test — notifications, message testeurs, prochaines étapes (cliquez ici)
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary-dark" />
              Bienvenue dans l'admin, pendant la phase de test
            </DialogTitle>
            <DialogDescription>
              Ce qu'il faut savoir pendant que les premiers testeurs utilisent l'application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 text-sm">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-1.5 text-primary-dark">
                <Mail className="h-4 w-4" /> Comment tu reçois les notifications
              </h3>
              <p className="text-muted-foreground">
                Chaque réservation déclenche automatiquement un email de confirmation au client
                et un email d'alerte à l'adresse admin configurée (Paramètres → « Notifications
                de réservation »).
              </p>
              <p className="text-muted-foreground flex items-start gap-1.5">
                <BellRing className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Tu peux aussi recevoir une notification directement sur ton téléphone si tu as
                installé l'application : va dans <strong>Paramètres → Notifications sur cet
                appareil</strong> et appuie sur « Activer ».
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-primary-dark">Message à transmettre aux testeurs</h3>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-line font-mono max-h-48 overflow-y-auto">
                {TESTER_MESSAGE}
              </div>
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié" : "Copier le message"}
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-1.5 text-primary-dark">
                <ListChecks className="h-4 w-4" /> Prochaines étapes
              </h3>
              <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                <li>Tu recevras bientôt tes identifiants complets une fois le nom de domaine officiel en place.</li>
                <li>L'historique des clients et réservations (Calendly, SimplyBook) sera importé dans l'application.</li>
                <li>Ce bandeau et la carte de test disparaîtront au moment du vrai lancement.</li>
              </ul>
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
