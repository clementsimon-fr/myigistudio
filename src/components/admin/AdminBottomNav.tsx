import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Pencil, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { MAIN_LINKS, EDITION_GROUPS, EDITION_LINKS } from "./adminNavConfig";

export default function AdminBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [editionOpen, setEditionOpen] = useState(false);
  const editionActive = EDITION_LINKS.some((l) => location.pathname.startsWith(l.url));

  const handleLogout = async () => {
    setEditionOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t bg-card">
        {MAIN_LINKS.map((l) => (
          <NavLink
            key={l.url}
            to={l.url}
            end={l.url === "/admin"}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground"
            activeClassName="text-primary-dark font-medium"
          >
            <l.icon className="h-5 w-5" />
            {l.title}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setEditionOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${editionActive ? "text-primary-dark font-medium" : "text-muted-foreground"}`}
        >
          <Pencil className="h-5 w-5" />
          Édition
        </button>
      </nav>

      <Sheet open={editionOpen} onOpenChange={setEditionOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
          <SheetHeader className="text-left mb-2">
            <SheetTitle>Édition</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-4">
            {EDITION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-0.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {group.links.map((l) => (
                    <NavLink
                      key={l.url}
                      to={l.url}
                      onClick={() => setEditionOpen(false)}
                      className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50"
                      activeClassName="bg-muted text-primary-dark font-medium"
                    >
                      <l.icon className="h-4 w-4 shrink-0" />
                      {l.title}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-0.5">
                Compte
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 rounded-lg border p-3 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Déconnexion
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
