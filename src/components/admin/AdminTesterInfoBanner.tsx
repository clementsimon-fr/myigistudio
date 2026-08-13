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

// En-tête numéroté partagé par les 3 étapes — matérialise visuellement que c'est une séquence
// à suivre dans l'ordre, pas 3 blocs d'info indépendants (même principe que TesterGuideBanner).
function StepHeader({ n, icon: Icon, title }: { n: number; icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-dark text-primary-dark-foreground text-xs font-bold shrink-0">
        {n}
      </span>
      <Icon className="h-4 w-4 text-primary-dark shrink-0" />
      <p className="text-sm font-semibold">{title}</p>
    </div>
  );
}

// Bandeau d'information pour Élodie (et tout futur admin) : explique son rôle pendant la phase
// de test, comment elle reçoit les notifications, fournit le message à transmettre aux
// testeurs, et les prochaines étapes. Temporaire — à retirer une fois le lancement réel fait.
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
              Bienvenue dans l'admin, Élodie !
            </DialogTitle>
            <DialogDescription>
              Le studio prépare le lancement de cette nouvelle application de réservation, et
              des testeurs vont commencer à réserver dès maintenant. Votre rôle pendant cette
              phase : surveiller que les réservations arrivent bien, et faire remonter tout ce
              qui vous semble bizarre. Voici comment ça se passe, en 3 étapes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg border p-3 space-y-2">
              <StepHeader n={1} icon={Mail} title="Vous recevez une notification à chaque réservation" />
              <p className="text-xs text-muted-foreground">
                Chaque réservation déclenche automatiquement un email de confirmation au client
                et un email d'alerte à l'adresse admin configurée (Paramètres → « Notifications
                de réservation »).
              </p>
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <BellRing className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Vous pouvez aussi recevoir une notification directement sur votre téléphone si
                vous avez installé l'application : allez dans <strong>Paramètres →
                Notifications sur cet appareil</strong> et appuyez sur « Activer ».
              </p>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <StepHeader n={2} icon={Copy} title="Invitez vos testeurs" />
              <p className="text-xs text-muted-foreground">Message prêt à copier-coller :</p>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-line font-mono max-h-40 overflow-y-auto">
                {TESTER_MESSAGE}
              </div>
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={handleCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié" : "Copier le message"}
              </Button>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <StepHeader n={3} icon={ListChecks} title="Ce qui arrive ensuite" />
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Vous recevrez bientôt vos identifiants complets une fois le nom de domaine officiel en place.</li>
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
