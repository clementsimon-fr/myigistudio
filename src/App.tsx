import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import RequireAdmin from "@/components/auth/RequireAdmin";
import FeedbackButton from "@/components/FeedbackButton";
import TesterGuideBanner from "@/components/TesterGuideBanner";
import ScrollToTop from "@/components/ScrollToTop";
// Page d'accueil chargée immédiatement (c'est la page que voit tout visiteur mobile en premier).
import Discover from "./pages/Discover";
// Tout le reste — espace client + l'intégralité de l'admin (13 pages) — était jusqu'ici
// regroupé dans le MÊME fichier JS que la page d'accueil (plus d'1 Mo au total), téléchargé et
// exécuté par chaque visiteur avant même de voir un cours, y compris sur mobile. Passage en
// import() paresseux : chaque page ne charge son code que lorsqu'on y navigue réellement.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MonEspace = lazy(() => import("./pages/MonEspace"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminClients = lazy(() => import("./pages/admin/Clients"));
const AdminActivites = lazy(() => import("./pages/admin/Activites"));
const AdminIntervenants = lazy(() => import("./pages/admin/Intervenants"));
const AdminTarifs = lazy(() => import("./pages/admin/Tarifs"));
const AdminContenu = lazy(() => import("./pages/admin/Contenu"));
const AdminDecouvrir = lazy(() => import("./pages/admin/Decouvrir"));
const AdminBoutons = lazy(() => import("./pages/admin/Boutons"));
const AdminBonsCadeaux = lazy(() => import("./pages/admin/BonsCadeaux"));
const AdminConditions = lazy(() => import("./pages/admin/Conditions"));
const AdminPlanning = lazy(() => import("./pages/admin/Planning"));
const AdminImport = lazy(() => import("./pages/admin/Import"));
const AdminParametres = lazy(() => import("./pages/admin/Parametres"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex justify-center items-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <TesterGuideBanner />
          <FeedbackButton />
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
