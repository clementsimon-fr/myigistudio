import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarCheck, LayoutDashboard, CheckCircle2 } from "lucide-react";
import { useDemoContext } from "@/contexts/DemoContext";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { createTempProfile } = useDemoContext();
  const [name, setName] = useState("");
  const [showChoice, setShowChoice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createTempProfile(name.trim());
    setShowChoice(true);
  };

  const handleContinueBooking = () => {
    setShowChoice(false);
    navigate(returnTo || "/reserver");
  };

  const handleGoToSpace = () => {
    setShowChoice(false);
    navigate("/mon-espace?welcome=1");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-display font-bold">
            <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Créez votre compte</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Prénom</Label>
              <Input id="name" placeholder="Ex : Marc" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </div>
            <Button type="submit" className="w-full">
              Créer mon compte
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to={`/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`} className="text-primary-dark font-medium hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={showChoice} onOpenChange={(o) => !o && handleGoToSpace()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Compte créé !
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Bienvenue {name}. Que souhaitez-vous faire maintenant ?
          </p>
          <div className="grid gap-2 pt-2">
            <Button className="w-full gap-2" onClick={handleContinueBooking}>
              <CalendarCheck className="h-4 w-4" /> Continuer votre réservation
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={handleGoToSpace}>
              <LayoutDashboard className="h-4 w-4" /> Découvrir votre espace client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
