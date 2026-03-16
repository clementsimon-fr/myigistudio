import { Bell, CalendarDays, CalendarRange, BookOpen, Users, UserCircle, CreditCard, FileText, Gift, LogOut, ScrollText, Lightbulb, FileSignature } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const sidebarGroups = [
  {
    label: "Organisation",
    items: [
      { title: "Activités et réservations", url: "/admin/activites", icon: BookOpen },
      { title: "Planning type", url: "/admin/planning-type", icon: CalendarRange },
      { title: "Notifications", url: "/admin", icon: Bell },
      { title: "Conditions", url: "/admin/conditions", icon: ScrollText },
    ],
  },
  {
    label: "Personnes",
    items: [
      { title: "Intervenants", url: "/admin/intervenants", icon: UserCircle },
      { title: "Clients", url: "/admin/clients", icon: Users },
    ],
  },
  {
    label: "Offres",
    items: [
      { title: "Tarifs", url: "/admin/tarifs", icon: CreditCard },
      { title: "Bons Cadeaux", url: "/admin/bons-cadeaux", icon: Gift },
    ],
  },
  {
    label: "Mon application",
    items: [
      { title: "Contenu du site", url: "/admin/contenu", icon: FileText },
      { title: "Contrat", url: "/admin/contrat", icon: FileSignature },
      { title: "Fonctionnalités", url: "/admin/fonctionnalites", icon: Lightbulb },
      { title: "Paramètres", url: "/admin/parametres", icon: UserCircle },
    ],
  },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {sidebarGroups.map((group, idx) => (
          <div key={group.label}>
            {idx > 0 && <Separator className="mx-3 my-1" />}
            <SidebarGroup>
              <SidebarGroupLabel>
                {!collapsed && (
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {group.label}
                  </span>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/admin"}
                          className="hover:bg-muted/50"
                          activeClassName="bg-muted text-primary-dark font-medium"
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}

        <Separator className="mx-3 my-1" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-muted/50 text-muted-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Retour au site</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
