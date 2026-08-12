import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FlaskConical, Share, SquarePlus, MoreVertical, Download, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DISMISS_KEY = "myigistudio_tester_guide_dismissed";

// L'événement que Chrome/Android émet quand l'app est installable — on le capture pour proposer
// un vrai bouton "Installer" plutôt que de renvoyer vers un menu à chercher soi-même.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Bloc "Télécharger l'application sur le téléphone" — guide iPhone (pas d'installation
// automatisable sur iOS/Safari, uniquement manuelle) vs Android (bouton d'installation natif
// quand Chrome le propose, sinon instructions de repli).
function InstallAppGuide() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [defaultTab] = useState<"ios" | "android">(isIOS() ? "ios" : "android");

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        <Smartphone className="h-3.5 w-3.5" /> Télécharger l'application sur le téléphone
      </p>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="android" className="text-xs">Android</TabsTrigger>
          <TabsTrigger value="ios" className="text-xs">iPhone</TabsTrigger>
        </TabsList>

        <TabsContent value="android" className="pt-3 space-y-2.5">
          {installed ? (
            <p className="text-xs text-muted-foreground">Application déjà installée sur cet appareil ✓</p>
          ) : deferredPrompt ? (
            <>
              <p className="text-xs text-muted-foreground">
                Votre navigateur propose l'installation directe :
              </p>
              <Button size="sm" className="w-full gap-1.5" onClick={handleInstallClick}>
                <Download className="h-3.5 w-3.5" /> Installer l'application
              </Button>
            </>
          ) : (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Depuis Chrome, sur cette page :</p>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">1</span>
                <MoreVertical className="h-3.5 w-3.5 shrink-0" />
                <span>Ouvrez le menu (⋮) en haut à droite</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">2</span>
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>Appuyez sur « Installer l'application » (ou « Ajouter à l'écran d'accueil »)</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ios" className="pt-3 space-y-2">
          <p className="text-xs text-muted-foreground mb-1">
            Depuis Safari (pas Chrome — iOS ne permet l'installation que depuis Safari) :
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">1</span>
            <Share className="h-3.5 w-3.5 shrink-0" />
            <span>Appuyez sur le bouton <strong>Partager</strong> (en bas de l'écran)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">2</span>
            <SquarePlus className="h-3.5 w-3.5 shrink-0" />
            <span>Choisissez <strong>« Sur l'écran d'accueil »</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">3</span>
            <span>Confirmez avec <strong>« Ajouter »</strong></span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
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

            <InstallAppGuide />

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
