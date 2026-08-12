import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Save, Loader2, LogOut, MessageCircle, Check, BellRing, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { saveSiteSettings } from "@/hooks/useSiteSettings";

interface FeedbackRow {
  id: string;
  message: string;
  priority: string;
  author_name: string | null;
  author_phone: string | null;
  author_role: string | null;
  status: string;
  created_at: string;
}

// L'API Push exige un Uint8Array pour applicationServerKey, pas la chaîne base64url brute.
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/30" },
  important: { label: "Important", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  discuss: { label: "Pour en parler", className: "bg-muted text-muted-foreground border-border" },
};

export default function AdminParametres() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [savingEmail, setSavingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const [notificationEmail, setNotificationEmail] = useState("");
  const [savingNotificationEmail, setSavingNotificationEmail] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "notification_email").maybeSingle()
      .then(({ data }) => { if (data?.value) setNotificationEmail(data.value); });
  }, []);

  const handleSaveNotificationEmail = async () => {
    setSavingNotificationEmail(true);
    await saveSiteSettings([{ key: "notification_email", value: notificationEmail.trim() }]);
    setSavingNotificationEmail(false);
    toast({ title: "Email de notification enregistré ✓" });
  };

  // --- Notifications push (app installée sur l'écran d'accueil) ---
  const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // iOS n'expose l'API Push que depuis l'app lancée en plein écran (ajoutée à l'écran d'accueil),
  // jamais depuis un onglet Safari classique — (window.navigator as any).standalone est la
  // propriété historique iOS, display-mode: standalone couvre Android/desktop.
  const isStandalone = typeof window !== "undefined" && (
    window.matchMedia?.("(display-mode: standalone)").matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
  const [pushSubscribed, setPushSubscribed] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!pushSupported) { setPushSubscribed(false); return; }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushSubscribed(!!sub))
      .catch(() => setPushSubscribed(false));
  }, [pushSupported]);

  const handleEnablePush = async () => {
    if (!user) return;
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Notifications refusées", description: "Autorisez les notifications dans les réglages iOS pour cette app si vous changez d'avis.", variant: "destructive" });
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = import.meta.env.VITE_WEBPUSH_PUBLIC_KEY as string | undefined;
      if (!publicKey) throw new Error("Clé publique de notification non configurée.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      } as any, { onConflict: "endpoint" });
      if (error) throw error;
      setPushSubscribed(true);
      toast({ title: "Notifications activées ✓" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible d'activer les notifications.", variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
      toast({ title: "Notifications désactivées" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message, variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const loadFeedback = async () => {
    setLoadingFeedback(true);
    const { data } = await supabase.from("dev_feedback").select("*").order("created_at", { ascending: false });
    if (data) setFeedbacks(data as unknown as FeedbackRow[]);
    setLoadingFeedback(false);
  };

  useEffect(() => { loadFeedback(); }, []);

  const priorityRank: Record<string, number> = { urgent: 0, important: 1, discuss: 2 };
  const visibleFeedback = feedbacks
    .filter(f => showResolved || f.status !== "traité")
    .sort((a, b) => (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3) || b.created_at.localeCompare(a.created_at));

  const toggleStatus = async (f: FeedbackRow) => {
    const newStatus = f.status === "traité" ? "nouveau" : "traité";
    await supabase.from("dev_feedback").update({ status: newStatus }).eq("id", f.id);
    setFeedbacks(prev => prev.map(x => x.id === f.id ? { ...x, status: newStatus } : x));
  };

  const handleSaveEmail = async () => {
    if (!email.trim() || email === user?.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email de confirmation envoyé ✓", description: `Ouvrez le lien reçu à ${email.trim()} pour valider le changement.` });
    }
  };

  const handleSavePassword = async () => {
    if (!password || password !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mot de passe modifié ✓" });
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <AdminLayout title="Paramètres">
      <div className="max-w-lg space-y-6">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-primary-dark flex items-center gap-2">
            <Mail className="h-4 w-4" /> Adresse e-mail de connexion
          </h2>
          <div>
            <Label>Adresse e-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Button className="gap-1.5" onClick={handleSaveEmail} disabled={savingEmail || !email.trim() || email === user?.email}>
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
          </Button>
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
          <Button className="gap-1.5" onClick={handleSavePassword} disabled={savingPassword || !password}>
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Changer le mot de passe
          </Button>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-primary-dark flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Notifications de réservation
          </h2>
          <div>
            <Label>Email recevant les nouvelles réservations</Label>
            <Input
              type="email"
              value={notificationEmail}
              onChange={e => setNotificationEmail(e.target.value)}
              placeholder="igistudiofr@gmail.com"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Chaque réservation client envoie un email de confirmation à la cliente et un email
              à cette adresse. Laissez vide pour utiliser l'adresse de contact par défaut.
            </p>
          </div>
          <Button className="gap-1.5" onClick={handleSaveNotificationEmail} disabled={savingNotificationEmail}>
            {savingNotificationEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
          </Button>

          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5" /> Notifications sur cet appareil
            </p>
            {!isStandalone ? (
              <p className="text-xs text-muted-foreground">
                Ajoutez d'abord l'app à votre écran d'accueil (Safari → Partager → « Sur l'écran d'accueil »),
                puis ouvrez-la depuis l'icône pour activer les notifications ici.
              </p>
            ) : !pushSupported ? (
              <p className="text-xs text-muted-foreground">Les notifications ne sont pas prises en charge sur cet appareil.</p>
            ) : pushSubscribed ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary-dark border-primary/20">Activées</Badge>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={handleDisablePush} disabled={pushBusy}>
                  {pushBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Désactiver"}
                </Button>
              </div>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={handleEnablePush} disabled={pushBusy}>
                {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Activer les notifications sur cet appareil
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary-dark flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Feedback
            </h2>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => setShowResolved(v => !v)}>
              {showResolved ? "Masquer traités" : "Voir traités"}
            </button>
          </div>
          {loadingFeedback ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : visibleFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun feedback{showResolved ? "" : " en attente"}.</p>
          ) : (
            <div className="space-y-2">
              {visibleFeedback.map(f => {
                const prio = PRIORITY_LABELS[f.priority] || PRIORITY_LABELS.important;
                const isDone = f.status === "traité";
                return (
                  <div key={f.id} className={`rounded-lg border p-3 space-y-2 ${isDone ? "opacity-60" : ""}`}>
                    <Badge variant="outline" className={`text-[10px] ${prio.className}`}>{prio.label}</Badge>
                    <p className="text-sm whitespace-pre-line">{f.message}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {f.author_name || "Anonyme"}{f.author_phone ? ` · ${f.author_phone}` : ""}{f.author_role ? ` (${f.author_role})` : ""}
                      </p>
                      <Button size="sm" variant={isDone ? "outline" : "default"} className="h-7 text-[11px] gap-1" onClick={() => toggleStatus(f)}>
                        <Check className="h-3 w-3" /> {isDone ? "Rouvrir" : "Traité"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-6">
          <Button variant="outline" className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
