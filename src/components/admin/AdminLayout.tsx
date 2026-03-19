import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";

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
            <SidebarTrigger />
            <h1 className="text-base sm:text-lg font-display font-bold text-primary-dark truncate">{title}</h1>
          </header>
          <main className="flex-1 p-3 sm:p-6 bg-muted/20 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
