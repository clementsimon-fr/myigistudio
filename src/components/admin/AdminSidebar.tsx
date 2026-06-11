import { useState, useEffect } from "react";
import { Bell, CalendarDays, CalendarRange, BookOpen, Users, UserCircle, CreditCard, FileText, Gift, LogOut, ScrollText, Lightbulb, FileSignature, Sun, ClipboardList, Sparkles } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface SidebarItem {
  title: string;
  url: string;
  icon: any;
  settingKey?: string;
  disabled?: boolean;
}

interface SidebarGroup_ {
  label: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup_[] = [
  {
    label: "",
    items: [
      { title: "Bonjour", url: "/admin/bonjour", icon: Sun },
    ],
  },
  {
    label: "Organisation",
    items: [
      { title: "Fiches activités", url: "/admin/activites", icon: ClipboardList },
      { title: "Planning", url: "/admin/planning", icon: BookOpen },
      { title: "Planning type", url: "/admin/planning-type", icon: CalendarRange, settingKey: "show_planning_type" },
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
    label: "Contenu",
    items: [
      { title: "Découvrir", url: "/admin/decouvrir", icon: Sparkles },
    ],
  },
  {
    label: "Mon application",
    items: [
      { title: "Événement", url: "/admin/contenu", icon: FileText },
      { title: "Contrat", url: "/admin/contrat", icon: FileSignature, disabled: true },
      { title: "Fonctionnalités", url: "/admin/fonctionnalites", icon: Lightbulb, disabled: true },
      { title: "Paramètres", url: "/admin/parametres", icon: UserCircle, disabled: true },
    ],
  },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("site_settings").select("key, value").in("key", ["show_planning_type"]).then(({ data }) => {
      const hidden = new Set<string>();
      if (data) {
        for (const row of data) {
          if (row.value === "false") hidden.add(row.key);
        }
      }
      setHiddenKeys(hidden);
    });
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {sidebarGroups.map((group, idx) => {
          const visibleItems = group.items.filter(item => !item.settingKey || !hiddenKeys.has(item.settingKey));
          if (visibleItems.length === 0 && group.label) return null;
          return (
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
                    {visibleItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          {item.disabled ? (
                            <div
                              aria-disabled="true"
                              className="flex items-center w-full text-muted-foreground/50 cursor-not-allowed select-none opacity-60"
                              title="Bientôt disponible"
                            >
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </div>
                          ) : (
                            <NavLink
                              to={item.url}
                              end={item.url === "/admin"}
                              className="hover:bg-muted/50"
                              activeClassName="bg-muted text-primary-dark font-medium"
                            >
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          );
        })}

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
