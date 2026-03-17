import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 gap-3 bg-card">
            <SidebarTrigger />
            <h1 className="text-lg font-display font-bold text-primary-dark">{title}</h1>
          </header>
          <main className="flex-1 p-4 sm:p-6 bg-muted/20 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
