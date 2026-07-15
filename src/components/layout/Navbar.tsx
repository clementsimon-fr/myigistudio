import { Link, useNavigate } from "react-router-dom";
import { User, ChevronRight, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { session, clientProfile, isAdmin: isAdminLike, signOut } = useAuth();
  const isLoggedIn = !!session;
  const isClient = !!clientProfile && !isAdminLike;
  const displayName = clientProfile?.first_name || clientProfile?.email || "Mon compte";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex flex-col leading-none">
          <span className="text-2xl font-display font-bold">
            <span className="text-brand-pink">My</span><span className="text-primary-dark">IgiStudio</span>
          </span>
          <span className="text-[10px] md:text-xs font-display font-semibold text-primary-dark/70 -mt-0.5">
            Yoga, Pilates & Poterie
          </span>
        </Link>

        {isLoggedIn ? (
          <>
            {/* Desktop */}
            <div className="hidden md:flex items-center gap-3">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace")}
                  className="flex items-center gap-1.5 bg-primary/15 text-primary-dark font-semibold px-4 py-2 rounded-full border-2 border-primary/30 hover:bg-primary/25 transition-colors text-sm"
                >
                  <User className="h-4 w-4" />
                  {displayName}
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Mon espace</span>
                </button>
              )}

              {isAdminLike && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/planning")}>
                  <Settings className="h-3.5 w-3.5" /> Espace Admin
                </Button>
              )}

              {!isAdminLike && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="h-3.5 w-3.5" /> Déconnexion
                </Button>
              )}
            </div>

            {/* Mobile: connected badge + logout */}
            <div className="md:hidden flex items-center gap-2">
              {isClient && (
                <button
                  onClick={() => navigate("/mon-espace")}
                  className="flex items-center gap-1.5 bg-primary/15 text-primary-dark font-semibold px-3 py-2 rounded-full border-2 border-primary/30 text-xs min-h-[44px]"
                >
                  <User className="h-4 w-4" />
                  {displayName}
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">Mon espace</span>
                </button>
              )}
              {isAdminLike && (
                <button
                  onClick={() => navigate("/admin/planning")}
                  className="flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-2 min-h-[44px]"
                >
                  <Settings className="h-4 w-4" /> Espace Admin
                </button>
              )}
              {!isAdminLike && (
                <button onClick={handleLogout} className="p-2 text-destructive" aria-label="Déconnexion">
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          /* Visitor: encadré around login icon */
          <Link to="/login">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-full border-primary/30 text-primary-dark min-h-[44px] px-4">
              <User className="h-4 w-4" />
              <span className="text-xs">Connexion</span>
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
}
