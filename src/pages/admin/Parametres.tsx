import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Save, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveSiteSettings } from "@/hooks/useSiteSettings";

export default function AdminParametres() {
  const { toast } = useToast();
  const [email, setEmail] = useState("elodie@myigistudio.fr");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPlanningType, setShowPlanningType] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    supabase.from("site_settings").select("key, value").eq("key", "show_planning_type").then(({ data }) => {
      if (data && data.length > 0) {
        setShowPlanningType(data[0].value !== "false");
      }
      setLoadingSettings(false);
    });
  }, []);

  const handleTogglePlanningType = async (checked: boolean) => {
    setShowPlanningType(checked);
    await saveSiteSettings([{ key: "show_planning_type", value: checked ? "true" : "false" }]);
    toast({ title: checked ? "Planning type visible ✓" : "Planning type masqué ✓" });
  };

  const handleSave = () => {
    if (password && password !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    toast({ title: "Paramètres enregistrés ✓" });
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <AdminLayout title="Paramètres">
      <div className="max-w-lg space-y-6">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-primary-dark flex items-center gap-2">
            <Mail className="h-4 w-4" /> Informations de contact
          </h2>
          <div>
            <Label>Adresse e-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-primary-dark flex items-center gap-2">
            <Lock className="h-4 w-4" /> Changer le mot de passe
          </h2>
          <div>
            <Label>Nouveau mot de passe</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <Label>Confirmer le mot de passe</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-primary-dark flex items-center gap-2">
            <CalendarRange className="h-4 w-4" /> Pages visibles
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Planning type</Label>
              <p className="text-xs text-muted-foreground">Afficher la page Planning type dans le menu</p>
            </div>
            <Switch
              checked={showPlanningType}
              onCheckedChange={handleTogglePlanningType}
              disabled={loadingSettings}
            />
          </div>
        </div>

        <Button className="gap-1.5" onClick={handleSave}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </AdminLayout>
  );
}
