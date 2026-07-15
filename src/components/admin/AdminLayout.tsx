import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import AdminSidebar from "./AdminSidebar";
import AdminBottomNav from "./AdminBottomNav";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b px-3 sm:px-4 gap-3 bg-card shrink-0">
            <SidebarTrigger className="hidden md:inline-flex" />
            <h1 className="text-base sm:text-lg font-display font-bold text-primary-dark truncate flex-1">{title}</h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link to="/">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Globe className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Voir le site</span>
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-8 pb-20 md:pb-8 bg-muted/20 overflow-x-hidden">{children}</main>
        </div>
        <AdminBottomNav />
      </div>
    </SidebarProvider>
  );
}
