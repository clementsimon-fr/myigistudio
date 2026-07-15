import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAdmin from "@/components/auth/RequireAdmin";
import FeedbackButton from "@/components/FeedbackButton";
import Discover from "./pages/Discover";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import MonEspace from "./pages/MonEspace";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminActivites from "./pages/admin/Activites";
import AdminIntervenants from "./pages/admin/Intervenants";
import AdminTarifs from "./pages/admin/Tarifs";
import AdminContenu from "./pages/admin/Contenu";
import AdminDecouvrir from "./pages/admin/Decouvrir";
import AdminBoutons from "./pages/admin/Boutons";
import AdminBonsCadeaux from "./pages/admin/BonsCadeaux";
import AdminConditions from "./pages/admin/Conditions";
import AdminPlanning from "./pages/admin/Planning";
import AdminImport from "./pages/admin/Import";
import AdminParametres from "./pages/admin/Parametres";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <FeedbackButton />
          <Routes>
            <Route path="/" element={<Discover />} />
            <Route path="/activites" element={<Navigate to="/" replace />} />
            {/* Legacy redirects */}
            <Route path="/yoga" element={<Navigate to="/" replace />} />
            <Route path="/poterie" element={<Navigate to="/" replace />} />
            <Route path="/ateliers" element={<Navigate to="/" replace />} />
            <Route path="/calendrier" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mon-espace" element={<MonEspace />} />
            <Route element={<RequireAdmin><Outlet /></RequireAdmin>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/reservations" element={<Navigate to="/admin/planning" replace />} />
              <Route path="/admin/activites" element={<AdminActivites />} />
              <Route path="/admin/planning" element={<AdminPlanning />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/import" element={<AdminImport />} />
              <Route path="/admin/intervenants" element={<AdminIntervenants />} />
              <Route path="/admin/tarifs" element={<AdminTarifs />} />
              <Route path="/admin/contenu" element={<AdminContenu />} />
              <Route path="/admin/decouvrir" element={<AdminDecouvrir />} />
              <Route path="/admin/boutons" element={<AdminBoutons />} />
              <Route path="/admin/bons-cadeaux" element={<AdminBonsCadeaux />} />
              <Route path="/admin/conditions" element={<AdminConditions />} />
              <Route path="/admin/parametres" element={<AdminParametres />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
