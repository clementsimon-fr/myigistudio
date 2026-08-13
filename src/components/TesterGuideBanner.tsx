import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FlaskConical, Share, SquarePlus, MoreVertical, Download, Smartphone, CreditCard, MessageCircle } from "lucide-react";
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

// En-tête numéroté partagé par les 3 étapes — matérialise visuellement que c'est une séquence
// à suivre dans l'ordre, pas 3 blocs d'info indépendants.
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

// Bloc "Télécharger l'application" — guide iPhone (installation manuelle uniquement, Safari
// n'expose pas d'API) vs Android (bouton d'installation natif quand Chrome le propose, sinon
// instructions de repli).
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
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">a</span>
              <MoreVertical className="h-3.5 w-3.5 shrink-0" />
              <span>Ouvrez le menu (⋮) en haut à droite</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">b</span>
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
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">a</span>
          <Share className="h-3.5 w-3.5 shrink-0" />
          <span>Appuyez sur le bouton <strong>Partager</strong> (en bas de l'écran)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">b</span>
          <SquarePlus className="h-3.5 w-3.5 shrink-0" />
          <span>Choisissez <strong>« Sur l'écran d'accueil »</strong></span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary-dark text-[10px] font-semibold shrink-0">c</span>
          <span>Confirmez avec <strong>« Ajouter »</strong></span>
        </div>
      </TabsContent>
    </Tabs>
  );
}

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
