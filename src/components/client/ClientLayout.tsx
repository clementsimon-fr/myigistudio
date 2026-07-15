import { useNavigate } from "react-router-dom";
import { CalendarPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface ClientLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function ClientLayout({ children, title }: ClientLayoutProps) {
  const navigate = useNavigate();
  const { clientProfile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-display font-bold text-primary-dark">
            Bonjour {clientProfile?.first_name || ""}
          </h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs rounded-full text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={async () => { await signOut(); navigate("/"); }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Bouton d'action principal */}
      <div className="sticky top-14 z-40 border-b bg-background">
        <div className="container py-2">
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs rounded-full min-h-[44px] px-4"
            onClick={() => navigate("/")}
          >
            <CalendarPlus className="h-4 w-4" />
            Faire une réservation
          </Button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
