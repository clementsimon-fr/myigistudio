import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Activites from "./pages/Activites";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MonEspace from "./pages/MonEspace";
import Reserver from "./pages/Reserver";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminReservations from "./pages/admin/Reservations";
import AdminClients from "./pages/admin/Clients";
import AdminActivites from "./pages/admin/Activites";
import Calendrier from "./pages/Calendrier";
import AdminIntervenants from "./pages/admin/Intervenants";
import AdminTarifs from "./pages/admin/Tarifs";
import AdminContenu from "./pages/admin/Contenu";
import AdminBonsCadeaux from "./pages/admin/BonsCadeaux";
import AdminConditions from "./pages/admin/Conditions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Activites />} />
          <Route path="/activites" element={<Activites />} />
          {/* Legacy redirects */}
          <Route path="/yoga" element={<Navigate to="/" replace />} />
          <Route path="/poterie" element={<Navigate to="/" replace />} />
          <Route path="/ateliers" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mon-espace" element={<MonEspace />} />
          <Route path="/reserver" element={<Reserver />} />
          <Route path="/calendrier" element={<Calendrier />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/reservations" element={<AdminReservations />} />
          <Route path="/admin/activites" element={<AdminActivites />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/intervenants" element={<AdminIntervenants />} />
          <Route path="/admin/tarifs" element={<AdminTarifs />} />
          <Route path="/admin/contenu" element={<AdminContenu />} />
          <Route path="/admin/bons-cadeaux" element={<AdminBonsCadeaux />} />
          <Route path="/admin/conditions" element={<AdminConditions />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
