import { CalendarDays, CreditCard, User, Compass, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useDemoContext } from "@/contexts/DemoContext";
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
import { useIsMobile } from "@/hooks/use-mobile";

const clientGroups = [
  {
    label: "Mon espace",
    items: [
      { title: "Réservations", url: "/mon-espace?section=reservations", icon: CalendarDays },
      { title: "Cartes Yoga", url: "/mon-espace?section=cartes", icon: CreditCard },
      { title: "Profil", url: "/mon-espace?section=profil", icon: User },
    ],
  },
  {
    label: "IgiStudio",
    items: [
      { title: "Activités", url: "/", icon: Compass },
      { title: "Planning", url: "/?view=planning-type", icon: Calendar },
    ],
  },
];

export default function ClientSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setCurrentProfile } = useDemoContext();

  const handleLogout = () => {
    setCurrentProfile(null);
    navigate("/");
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {clientGroups.map((group, idx) => (
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
                          className="hover:bg-muted/50"
                          activeClassName="bg-muted text-primary-dark font-medium"
                          onClick={handleNavClick}
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
                  <button onClick={() => { handleNavClick(); handleLogout(); }} className="flex items-center w-full hover:bg-muted/50 text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Déconnexion</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
