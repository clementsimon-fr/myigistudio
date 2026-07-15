import { Bell, BookOpen, Users, UserCircle, CreditCard, Gift, LogOut, ScrollText, ClipboardList, Upload, Settings2 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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

interface SidebarItem {
  title: string;
  url: string;
  icon: any;
}

interface SidebarGroup_ {
  label: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup_[] = [
  {
    label: "Organisation",
    items: [
      { title: "Fiches activités", url: "/admin/activites", icon: ClipboardList },
      { title: "Mon agenda", url: "/admin/planning", icon: BookOpen },
      { title: "Notifications", url: "/admin", icon: Bell },
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
      { title: "Tarifs Yoga", url: "/admin/tarifs", icon: CreditCard },
      { title: "Bons Cadeaux", url: "/admin/bons-cadeaux", icon: Gift },
      { title: "Conditions", url: "/admin/conditions", icon: ScrollText },
    ],
  },
  {
    label: "Paramètres",
    items: [
      { title: "Paramètres", url: "/admin/parametres", icon: Settings2 },
      { title: "Import de données", url: "/admin/import", icon: Upload },
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
