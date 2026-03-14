import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Save } from "lucide-react";

export default function AdminParametres() {
  const { toast } = useToast();
  const [email, setEmail] = useState("elodie@myigistudio.fr");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

        <Button className="gap-1.5" onClick={handleSave}>
          <Save className="h-4 w-4" /> Enregistrer
        </Button>
      </div>
    </AdminLayout>
  );
}
