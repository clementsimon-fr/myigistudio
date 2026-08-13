import { CalendarDays, Bell, Users, ClipboardList, UserCircle, CreditCard, Gift, ScrollText, Settings2, Upload } from "lucide-react";

// Source unique pour la structure du menu admin — utilisée à la fois par AdminBottomNav
// (mobile, 4 onglets) et AdminSidebar (desktop), pour que les deux restent identiques sans
// jamais diverger. 3 sections directes + "Édition" qui regroupe tout le reste par sous-thème.

export interface AdminNavLink {
  title: string;
  url: string;
  icon: any;
}

export interface AdminNavGroup {
  label: string;
  links: AdminNavLink[];
}

// Les 3 sections directes (un onglet mobile chacune / un lien direct en haut du menu desktop).
export const MAIN_LINKS: AdminNavLink[] = [
  { title: "Mon agenda", url: "/admin/planning", icon: CalendarDays },
  { title: "Notifications", url: "/admin", icon: Bell },
  { title: "Clients", url: "/admin/clients", icon: Users },
];

// La 4e section ("Édition") regroupe tout le reste, par sous-thème.
export const EDITION_GROUPS: AdminNavGroup[] = [
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

export const EDITION_LINKS: AdminNavLink[] = EDITION_GROUPS.flatMap((g) => g.links);
