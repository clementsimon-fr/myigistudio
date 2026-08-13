import { useNavigate } from "react-router-dom";
import { LogOut, Pencil } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { MAIN_LINKS, EDITION_GROUPS } from "./adminNavConfig";

// Même organisation que le menu mobile (AdminBottomNav) : 3 liens directs (Mon agenda,
// Notifications, Clients), puis "Édition" qui regroupe tout le reste par sous-thème — les deux
// composants partagent la même config (adminNavConfig.ts) pour ne jamais diverger.
export default function AdminSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_LINKS.map((item) => (
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

        <Separator className="mx-3 my-1" />

        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                <Pencil className="h-3 w-3" /> Édition
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {EDITION_GROUPS.map((group) => (
              <div key={group.label} className="mb-1">
                {!collapsed && (
                  <p className="text-[10px] text-muted-foreground/70 px-2 pt-1.5 pb-0.5">{group.label}</p>
                )}
                <SidebarMenu>
                  {group.links.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
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
              </div>
            ))}

            {/* Déconnexion : directement dans le menu Édition (pas noyée dans la page Paramètres) */}
            <div className="mb-1">
              {!collapsed && (
                <p className="text-[10px] text-muted-foreground/70 px-2 pt-1.5 pb-0.5">Compte</p>
              )}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/10 text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Déconnexion</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

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
