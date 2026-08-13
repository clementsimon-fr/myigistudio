import { useEffect, useState } from "react";
import { Share, SquarePlus, MoreVertical, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// L'événement que Chrome/Android émet quand l'app est installable — on le capture pour proposer
// un vrai bouton "Installer" plutôt que de renvoyer vers un menu à chercher soi-même.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Guide "Télécharger l'application" — partagé entre TesterGuideBanner (testeurs) et
// AdminTesterInfoBanner (Élodie/admin), pour que les deux publics aient exactement la même
// qualité d'explication au lieu d'une version réduite dupliquée à la main d'un côté.
// iPhone : installation manuelle uniquement (Safari n'expose pas d'API d'installation).
// Android : bouton d'installation natif quand Chrome le propose, sinon instructions de repli.
export default function InstallAppGuide() {
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
