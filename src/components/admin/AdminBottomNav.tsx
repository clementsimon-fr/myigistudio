import { useState } from "react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { CalendarDays, Pencil, Users, ClipboardList, CreditCard, Gift, ScrollText, UserCircle, Settings2, Upload, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const EDITION_GROUPS = [
  {
    label: "Organisation",
    links: [
      { title: "Fiches activités", url: "/admin/activites", icon: ClipboardList },
      { title: "Intervenants", url: "/admin/intervenants", icon: UserCircle },
    ],
  },
  {
    label: "Offres",
    links: [
      { title: "Tarifs Yoga", url: "/admin/tarifs", icon: CreditCard },
      { title: "Bons Cadeaux", url: "/admin/bons-cadeaux", icon: Gift },
      { title: "Conditions", url: "/admin/conditions", icon: ScrollText },
    ],
  },
  {
    label: "Paramètres",
    links: [
      { title: "Paramètres", url: "/admin/parametres", icon: Settings2 },
      { title: "Import de données", url: "/admin/import", icon: Upload },
    ],
  },
];

const EDITION_LINKS = EDITION_GROUPS.flatMap((g) => g.links);

export default function AdminBottomNav() {
  const location = useLocation();
  const [editionOpen, setEditionOpen] = useState(false);
  const editionActive = EDITION_LINKS.some((l) => location.pathname.startsWith(l.url));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t bg-card">
        <NavLink
          to="/admin/planning"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground"
          activeClassName="text-primary-dark font-medium"
        >
          <CalendarDays className="h-5 w-5" />
          Mon agenda
        </NavLink>
        <NavLink
          to="/admin"
          end
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground"
          activeClassName="text-primary-dark font-medium"
        >
          <Bell className="h-5 w-5" />
          Notifications
        </NavLink>
        <button
          type="button"
          onClick={() => setEditionOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${editionActive ? "text-primary-dark font-medium" : "text-muted-foreground"}`}
        >
          <Pencil className="h-5 w-5" />
          Édition
        </button>
        <NavLink
          to="/admin/clients"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs text-muted-foreground"
          activeClassName="text-primary-dark font-medium"
        >
          <Users className="h-5 w-5" />
          Clients
        </NavLink>
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
