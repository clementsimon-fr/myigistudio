import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PostSignupChoice from "@/components/PostSignupChoice";
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

      <PostSignupChoice
        open={showChoice}
        name={name}
        hasBookingInProgress={!!returnTo}
        onContinueBooking={() => { setShowChoice(false); navigate(returnTo || "/reserver"); }}
        onGoToSpace={() => { setShowChoice(false); navigate("/mon-espace?welcome=1"); }}
      />
    </div>
  );
}

