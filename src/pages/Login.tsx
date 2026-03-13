import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, User } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-display font-bold text-primary-dark">
            MyIgi<span className="text-primary italic">Studio</span>
          </Link>
          <p className="mt-2 text-muted-foreground">Choisissez votre espace</p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <Button
            onClick={() => navigate("/mon-espace")}
            className="w-full h-14 text-base gap-3 bg-primary-dark text-primary-dark-foreground hover:bg-primary-dark/90"
          >
            <User className="h-5 w-5" />
            Accéder en tant que Client
          </Button>

          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            className="w-full h-14 text-base gap-3 border-primary-dark text-primary-dark hover:bg-primary-dark/10"
          >
            <Shield className="h-5 w-5" />
            Accéder en tant qu'Admin
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
