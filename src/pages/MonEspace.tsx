import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, CreditCard, Clock, Loader2, User, XCircle, ArrowRight, Bell, MapPin, ShoppingCart, LogOut, ChevronDown, RefreshCw, Gift, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { makeDisplayName } from "@/lib/client-name";
import ClientLayout from "@/components/client/ClientLayout";
import MockStripeModal from "@/components/demo/MockStripeModal";
import ContactElodieButton from "@/components/ContactElodieButton";
import YogaFormulasBlock from "@/components/YogaFormulasBlock";

interface Reservation { id: string; client_name: string; activity_name: string; activity_type: string; date: string; time: string; end_time: string; participants: number; status: string; created_at: string; course_id: string | null; workshop_id: string | null; booking_group_id: string | null; payment_method: string | null; payment_amount: number; user_id: string | null; }
interface ClientCard { id: string; client_name: string; card_name: string; total_sessions: number; used_sessions: number; expires_at: string; created_at: string; }
interface PricingCard { id: string; name: string; sessions: number; price: number; validity: string; popular: boolean; sort_order: number; payment_info: string; }

const statusColors: Record<string, string> = {
  "confirmé": "bg-primary/15 text-primary-dark border-primary/30",
  "annulé": "bg-destructive/10 text-destructive border-destructive/30",
  "liste d'attente": "bg-accent/20 text-accent-foreground border-accent/30",
};

// CGV "annulation" (table `conditions`) : annulation possible jusqu'à 12h avant le cours.
const CANCEL_MIN_HOURS = 12;

// Date locale (pas toISOString, qui décale d'un jour en UTC+ comme Europe/Paris)
function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// La poterie n'a ni annulation ni reprogrammation en libre-service (contrairement au yoga) —
// Élodie gère ces demandes directement pour les ateliers.
function isPotteryActivity(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("poterie") || n.includes("tour") || n.includes("modelage");
}

function getCancelEligibility(date: string, time: string) {
  const [h, m] = time.split(":").map(Number);
  const courseStart = new Date(date + "T00:00:00");
  courseStart.setHours(h, m, 0, 0);
  const hoursUntil = (courseStart.getTime() - Date.now()) / (1000 * 60 * 60);
  return { canCancel: hoursUntil >= CANCEL_MIN_HOURS, hoursUntil };
}

// La durée de validité admin ("3 mois", "1 an") est du texte libre — même parsing que
// dans BookingSheet.tsx pour rester cohérent entre les deux parcours d'achat.
function computeExpiryFromValidity(validity: string): string {
  const months = parseInt(validity?.match(/(\d+)/)?.[1] || "1", 10);
  const isYear = /an|année/i.test(validity || "");
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (isYear ? months * 12 : months));
  return `${expiresAt.getFullYear()}-${String(expiresAt.getMonth() + 1).padStart(2, "0")}-${String(expiresAt.getDate()).padStart(2, "0")}`;
}

interface PurchaseEntry {
  id: string;
  date: string;
  label: string;
  detail: string;
  amount: number;
  icon: "card" | "reservation" | "voucher";
}

export default function MonEspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { session, user, clientProfile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const CLIENT_NAME = clientProfile ? (makeDisplayName(clientProfile.first_name, clientProfile.last_name) || clientProfile.email) : "";
  const isWelcome = searchParams.get("welcome") === "1";
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isWelcome) {
      setShowWelcome(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [isWelcome]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderSms, setReminderSms] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(true);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [resFilter, setResFilter] = useState("all");
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [buyStep, setBuyStep] = useState<1 | 2>(1);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Reservation | null>(null);
  const [activityModalities, setActivityModalities] = useState<string>("");
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeDescription, setStripeDescription] = useState("");
  const [selectedPricingCard, setSelectedPricingCard] = useState<PricingCard | null>(null);
  const [voucherHistory, setVoucherHistory] = useState<{ id: string; code: string; card_name: string; amount: number; sessions: number; used_at: string | null }[]>([]);
  const [groupParticipants, setGroupParticipants] = useState<string[]>([]);
  const [rescheduleTarget, setRescheduleTarget] = useState<Reservation | null>(null);

  // Bouton retour du téléphone / geste swipe-back : reste dans l'espace client au lieu
  // de renvoyer vers la page d'accueil (le client peut toujours y aller via "Faire une
  // réservation" ou "Déconnexion", qui sont des navigations explicites). On empile plusieurs
  // entrées d'un coup (pas juste une seule qu'on re-pousserait après coup) : sur un vrai geste
  // de swipe-back iOS, le popstate peut arriver après que la page ait déjà commencé sa
  // transition, donc une seule entrée de garde est trop fragile pour être fiable à 100%.
  useEffect(() => {
    if (authLoading || !session) return;
    const GUARD_DEPTH = 30;
    for (let i = 0; i < GUARD_DEPTH; i++) window.history.pushState({ __mesRoot: true }, "");
    const handlePopState = () => {
      window.history.pushState({ __mesRoot: true }, "");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [authLoading, session]);

  useEffect(() => {
    if (!CLIENT_NAME) return;
    const load = async () => {
      setLoading(true);
      const [resR, resC, resPC, resV] = await Promise.all([
        supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false }),
        supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false }),
        supabase.from("pricing_cards").select("*").order("sort_order"),
        supabase.from("gift_vouchers").select("*").or(`buyer_name.eq.${CLIENT_NAME},beneficiary_name.eq.${CLIENT_NAME}`).eq("used", true),
      ]);
      if (resR.data) setReservations(resR.data as unknown as Reservation[]);
      if (resC.data) setCards(resC.data as unknown as ClientCard[]);
      if (resPC.data) setPricingCards(resPC.data as unknown as PricingCard[]);
      if (resV.data) setVoucherHistory(resV.data as unknown as typeof voucherHistory);
      setLoading(false);
    };
    load();
  }, [CLIENT_NAME]);

  useEffect(() => {
    if (clientProfile) {
      setReminderSms(clientProfile.reminder_sms);
      setReminderEmail(clientProfile.reminder_email);
      setPhone(clientProfile.phone || "");
    }
  }, [clientProfile]);

  useEffect(() => {
    if (!viewingReservation) { setActivityModalities(""); setGroupParticipants([]); return; }
    const fetchDetails = async () => {
      const r = viewingReservation;
      if (r.activity_type === "course" && r.course_id) {
        const { data } = await supabase.from("courses").select("modalities").eq("id", r.course_id).maybeSingle();
        setActivityModalities((data as any)?.modalities || "");
      } else if (r.activity_type === "workshop" && r.workshop_id) {
        const { data } = await supabase.from("workshops").select("modalities").eq("id", r.workshop_id).maybeSingle();
        setActivityModalities((data as any)?.modalities || "");
      } else {
        setActivityModalities("");
      }
      if (r.booking_group_id) {
        const { data } = await supabase.from("reservations").select("client_name, user_id").eq("booking_group_id", r.booking_group_id).eq("date", r.date);
        if (data) {
          const names = Array.from(new Set((data as any[]).map((row) => row.client_name).filter(Boolean)));
          setGroupParticipants(names);
        }
      } else {
        setGroupParticipants([]);
      }
    };
    fetchDetails();
  }, [viewingReservation]);

  // 1.11: Only count confirmed reservations (exclude cancelled)
  const confirmedRes = reservations.filter(r => r.status !== "annulé");
  const yogaRes = confirmedRes.filter(r => r.activity_type === "course");
  const potteryRes = confirmedRes.filter(r => r.activity_type === "workshop" && isPotteryActivity(r.activity_name));
  const atelierRes = confirmedRes.filter(r => r.activity_type === "workshop" && !potteryRes.includes(r));
  const filteredRes = resFilter === "all" ? confirmedRes : resFilter === "yoga" ? yogaRes : resFilter === "poterie" ? potteryRes : atelierRes;

  const saveProfile = async () => {
    if (!user) return;
    await supabase.from("client_profiles").update({ reminder_sms: reminderSms, reminder_email: reminderEmail }).eq("id", user.id);
    await refreshProfile();
    toast({ title: "Profil mis à jour ✓" });
  };

  const savePhone = async () => {
    if (!user) return;
    setSavingPhone(true);
    const { error } = await supabase.from("client_profiles").update({ phone }).eq("id", user.id);
    setSavingPhone(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    await refreshProfile();
    toast({ title: "Téléphone mis à jour ✓" });
  };

  const savePassword = async () => {
    if (newPassword.length < 6) { toast({ title: "6 caractères minimum", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mot de passe modifié ✓" });
    setNewPassword("");
    setConfirmPassword("");
  };

  const [rescheduleOptions, setRescheduleOptions] = useState<{ date: string; time: string; end_time: string }[]>([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const DAY_INDEX: Record<string, number> = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
  const localDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const openReschedule = async (r: Reservation) => {
    setRescheduleTarget(r);
    setRescheduleLoading(true);
    setRescheduleOptions([]);
    const todayStr = todayLocalStr();
    if (r.activity_type === "course" && r.course_id) {
      const { data } = await supabase.from("course_schedules").select("day, time, end_time").eq("course_id", r.course_id);
      const opts: { date: string; time: string; end_time: string }[] = [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 30 && opts.length < 8; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const dow = d.getDay();
        for (const s of (data || []) as any[]) {
          if (DAY_INDEX[(s.day || "").toLowerCase()] !== dow) continue;
          const dateStr = localDateStr(d);
          if (dateStr === r.date && s.time === r.time) continue;
          if (dateStr < todayStr) continue;
          opts.push({ date: dateStr, time: s.time, end_time: s.end_time });
        }
      }
      setRescheduleOptions(opts);
    } else if (r.activity_type === "workshop" && r.workshop_id) {
      const { data } = await supabase.from("workshops").select("date, time, end_time").eq("name", r.activity_name).gte("date", todayStr);
      const opts = ((data || []) as any[])
        .filter((w) => !(w.date === r.date && w.time === r.time))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((w) => ({ date: w.date, time: w.time, end_time: w.end_time }));
      setRescheduleOptions(opts);
    }
    setRescheduleLoading(false);
  };

  const confirmReschedule = async (opt: { date: string; time: string; end_time: string }) => {
    if (!rescheduleTarget) return;
    setRescheduleSaving(true);
    const r = rescheduleTarget;
    const query = r.booking_group_id
      ? supabase.from("reservations").update({ date: opt.date, time: opt.time, end_time: opt.end_time }).eq("booking_group_id", r.booking_group_id).eq("date", r.date)
      : supabase.from("reservations").update({ date: opt.date, time: opt.time, end_time: opt.end_time }).eq("id", r.id);
    const { error } = await query;
    setRescheduleSaving(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Réservation reprogrammée ✓", description: `Nouvelle date : ${new Date(opt.date + "T00:00:00").toLocaleDateString("fr-FR")} à ${opt.time}` });
    setRescheduleTarget(null);
    setViewingReservation(null);
    const { data } = await supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false });
    if (data) setReservations(data as unknown as Reservation[]);
  };

  const handleCancelReservation = async (r: Reservation) => {
    await supabase.from("reservations").update({ status: "annulé" }).eq("id", r.id);
    // Un cours annulé payé par carte du compte redonne un cours de crédit — on rend la séance à
    // la carte dont la validité expire le plus tôt parmi celles déjà entamées (cohérent avec
    // l'ordre de consommation utilisé à la réservation : soonest-expiry first).
    if (r.activity_type === "course" && r.payment_method === "Carte du compte" && user) {
      const { data: myCards } = await supabase
        .from("client_cards")
        .select("id, used_sessions, expires_at")
        .eq("user_id", user.id)
        .gt("used_sessions", 0)
        .order("expires_at", { ascending: true })
        .limit(1);
      const card = (myCards as any[] | null)?.[0];
      if (card) {
        await supabase.from("client_cards").update({ used_sessions: card.used_sessions - 1 }).eq("id", card.id);
        const { data: cardsData } = await supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false });
        if (cardsData) setCards(cardsData as unknown as ClientCard[]);
      }
    }
    toast({ title: "En annulant, nous espérons que vous allez bien, et, nous vous remercions de prévenir l'intervenant. À bientôt ❤️" });
    setCancelConfirm(null);
    setViewingReservation(null);
    const { data } = await supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false });
    if (data) setReservations(data as unknown as Reservation[]);
  };

  const handleBuyCard = (card: PricingCard) => {
    setSelectedPricingCard(card);
    setStripeAmount(card.price);
    setStripeDescription(`${card.name} — MyIgiStudio`);
    setShowStripeModal(true);
  };

  const handleStripeSuccess = async () => {
    setShowStripeModal(false);
    if (!selectedPricingCard) return;
    await supabase.from("client_cards").insert({
      client_name: CLIENT_NAME,
      user_id: user?.id,
      card_name: selectedPricingCard.name,
      total_sessions: selectedPricingCard.sessions,
      used_sessions: 0,
      expires_at: computeExpiryFromValidity(selectedPricingCard.validity),
    } as any);
    toast({ title: `${selectedPricingCard.name} achetée avec succès ! 🎉` });
    // Refresh cards
    const { data } = await supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false });
    if (data) setCards(data as unknown as ClientCard[]);
    setSelectedPricingCard(null);
  };

  const unitCard = pricingCards.find(c => c.sessions === 1);
  const unitPrice = unitCard ? unitCard.price : null;

  const totalCredits = cards.reduce((sum, c) => sum + (c.total_sessions - c.used_sessions), 0);

  // Cartes encore utilisables vs. cartes vidées — ces dernières partent dans le rollup
  // "Anciennes cartes" pour ne pas encombrer la vue principale.
  const activeCards = cards.filter(c => c.total_sessions - c.used_sessions > 0);
  const oldCards = cards.filter(c => c.total_sessions - c.used_sessions <= 0);

  // Historique des achats unifié : cartes (client_cards), achats à l'unité réglés au moment
  // d'une réservation (reservations.payment_amount), et bons cadeaux utilisés. Les cartes
  // achetées pendant une réservation créent à la fois une ligne "Formule" sur la réservation
  // ET une carte dans client_cards — on exclut donc les lignes "Formule" côté réservations
  // pour ne pas afficher deux fois le même achat.
  const purchaseEntries: PurchaseEntry[] = [
    ...cards.map((c): PurchaseEntry => ({
      id: `card-${c.id}`,
      date: c.created_at,
      label: c.card_name,
      detail: `${c.total_sessions} cours crédité${c.total_sessions > 1 ? "s" : ""}`,
      amount: pricingCards.find(p => p.name === c.card_name)?.price ?? 0,
      icon: "card",
    })),
    ...reservations
      .filter(r => r.payment_amount > 0 && r.payment_method && !r.payment_method.startsWith("Formule"))
      .map((r): PurchaseEntry => ({
        id: `res-${r.id}`,
        date: r.created_at,
        label: r.payment_method as string,
        detail: r.activity_name,
        amount: r.payment_amount,
        icon: "reservation",
      })),
    ...voucherHistory.map((v): PurchaseEntry => ({
      id: `voucher-${v.id}`,
      date: v.used_at || "",
      label: `Bon cadeau ${v.code}`,
      detail: `Utilisé comme moyen de paiement — ${v.card_name}`,
      amount: 0,
      icon: "voucher",
    })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!authLoading && !session) {
    return <Navigate to="/login?returnTo=%2Fmon-espace" replace />;
  }

  return (
    <ClientLayout title="Mon espace">
      {authLoading || loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* ─── BONJOUR + KPI ─── */}
          <div className="max-w-3xl mb-6">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border p-5 md:p-6">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-white/70 backdrop-blur flex items-center justify-center">
                  <User className="h-7 w-7 text-primary-dark" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Bonjour</p>
                  <h2 className="text-xl font-display font-semibold text-primary-dark">{CLIENT_NAME}</h2>
                </div>
              </div>

              {/* 2 stats */}
              <div className="grid grid-cols-2 gap-2 md:gap-3 mt-5">
                <div className="rounded-xl bg-white/70 backdrop-blur p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cours Yoga</p>
                  <p className="text-2xl font-bold text-primary-dark mt-0.5">{totalCredits}</p>
                  <p className="text-[10px] text-muted-foreground">restant{totalCredits > 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-xl bg-white/70 backdrop-blur p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">À venir</p>
                  <p className="text-2xl font-bold text-primary-dark mt-0.5">
                    {confirmedRes.filter(r => r.date >= todayLocalStr()).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">réservation(s)</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RÉSERVATIONS ─── */}
          <div className="max-w-3xl space-y-4 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-primary-dark">Mes réservations</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: "all", l: `Toutes (${confirmedRes.length})` },
                  { v: "yoga", l: `Yoga (${yogaRes.length})` },
                  { v: "poterie", l: `Poterie (${potteryRes.length})` },
                ].map(f => (
                  <Button key={f.v} size="sm" variant={resFilter === f.v ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setResFilter(f.v)}>{f.l}</Button>
                ))}
              </div>
              {filteredRes.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Aucune réservation dans cette catégorie.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/?view=planning")}>Voir le planning</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredRes.map(r => {
                    const isConfirmed = r.status === "confirmé";
                    const todayStr = todayLocalStr();
                    const isFuture = r.date >= todayStr;
                    return (
                      <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <div className="text-center min-w-[40px]">
                          <p className="text-base font-bold text-primary-dark">{new Date(r.date + "T00:00:00").getDate()}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{new Date(r.date + "T00:00:00").toLocaleDateString("fr-FR", { month: "short" })}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.activity_name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {r.time}{r.end_time ? ` - ${r.end_time}` : ""}
                            {r.participants > 1 && <span>· {r.participants} pers.</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isConfirmed && isFuture && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] gap-1" onClick={() => setViewingReservation(r)}>
                              <ArrowRight className="h-3 w-3" /> Accéder
                            </Button>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

          {/* ─── CARTES YOGA (méta-bloc unique) ─── */}
          <div className="max-w-3xl rounded-xl border bg-card p-5 space-y-6 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-primary-dark">Mes cartes Yoga</h2>
                <div className="h-14 w-14 rounded-full bg-[hsl(210,60%,55%)]/10 flex items-center justify-center">
                  <CreditCard className="h-7 w-7 text-[hsl(210,60%,55%)]" />
                </div>
              </div>

              {/* Active cards */}
              <div>
                <h3 className="text-sm font-semibold text-primary-dark mb-3">Cartes actives</h3>
                {activeCards.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed">
                    <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune carte active.</p>
                    <p className="text-xs text-muted-foreground mt-1">Achetez une carte ci-dessous pour commencer.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeCards.map(card => {
                      const remaining = card.total_sessions - card.used_sessions;
                      const pct = (card.used_sessions / card.total_sessions) * 100;
                      return (
                        <div key={card.id} className="rounded-xl border bg-background p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm text-primary-dark">{card.card_name}</h3>
                            <span className="text-[10px] md:text-xs text-muted-foreground">Valable jusqu'au {new Date(card.expires_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-[hsl(210,60%,55%)] transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium">{card.used_sessions}/{card.total_sessions}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{remaining} cours restant{remaining > 1 ? "s" : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Achat via assistant en bas d'écran */}
              <Button variant="outline" className="w-full gap-2" onClick={() => { setBuyStep(1); setBuySheetOpen(true); }}>
                <ShoppingCart className="h-4 w-4" /> Ajouter cartes yoga
              </Button>

              {/* Anciennes cartes (rollup) */}
              {oldCards.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between rounded-lg border bg-background/60 p-3 hover:bg-muted/30 transition-colors group">
                      <span className="text-sm font-medium text-muted-foreground">Anciennes cartes ({oldCards.length})</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 pt-2">
                    {oldCards.map(card => (
                      <div key={card.id} className="rounded-lg border bg-background/60 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{card.card_name}</p>
                          <p className="text-[11px] text-muted-foreground">Expirée le {new Date(card.expires_at).toLocaleDateString("fr-FR")}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{card.used_sessions}/{card.total_sessions} cours utilisés</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Purchase history — l'ensemble des transactions, pas que les cartes */}
              {purchaseEntries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-primary-dark mb-3">Historique des achats</h3>
                  <div className="space-y-2">
                    {purchaseEntries.map(entry => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {entry.icon === "card" && <CreditCard className="h-4 w-4 text-primary-dark" />}
                          {entry.icon === "reservation" && <Receipt className="h-4 w-4 text-primary-dark" />}
                          {entry.icon === "voucher" && <Gift className="h-4 w-4 text-primary-dark" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.label}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {entry.date ? new Date(entry.date).toLocaleDateString("fr-FR") : ""} · {entry.detail}
                          </p>
                        </div>
                        {entry.amount > 0 && <span className="text-sm font-semibold shrink-0">{entry.amount} €</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Assistant d'achat : formules → suivant → résumé → payer */}
          <Sheet open={buySheetOpen} onOpenChange={setBuySheetOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>{buyStep === 1 ? "Choisir une formule" : "Résumé de la commande"}</SheetTitle>
              </SheetHeader>
              <div className="pt-2 pb-6">
                {buyStep === 1 && (
                  <>
                    <YogaFormulasBlock
                      pricingCards={pricingCards}
                      onSelectCard={(card) => { setSelectedPricingCard(card as PricingCard); setBuyStep(2); }}
                      showHeader={false}
                    />
                    <div className="mt-4">
                      <ContactElodieButton variant="outline" className="text-xs" />
                    </div>
                  </>
                )}
                {buyStep === 2 && selectedPricingCard && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">
                          {selectedPricingCard.sessions === 1 ? "Carte Yoga à l'unité" : `Cartes Yoga "${selectedPricingCard.name}"`}
                        </p>
                        <Badge variant="secondary">
                          {selectedPricingCard.sessions >= 9999 ? "Illimité" : `${selectedPricingCard.sessions} cours`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Validité : {selectedPricingCard.validity}</p>
                      <div className="border-t pt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="text-lg font-bold">{selectedPricingCard.price} €</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setBuyStep(1)}>Retour</Button>
                      <Button className="flex-1 gap-1.5" onClick={() => { setBuySheetOpen(false); handleBuyCard(selectedPricingCard); }}>
                        <CreditCard className="h-4 w-4" /> Payer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* ─── PROFIL (bloc repliable) ─── */}
          <div className="max-w-lg mb-8">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full flex items-center justify-between rounded-xl border bg-card p-4 md:p-6 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="h-7 w-7 text-primary-dark" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-display font-semibold text-primary-dark">{CLIENT_NAME}</h3>
                      <p className="text-xs text-muted-foreground">
                        Membre depuis {reservations.length > 0 ? new Date(reservations[reservations.length - 1]?.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "récemment"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="rounded-xl border bg-card p-4 md:p-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bell className="h-4 w-4 text-primary-dark" />
                      <p className="text-sm font-medium">Préférences de rappel</p>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">📧 Rappel par e-mail</p>
                        <p className="text-[10px] text-muted-foreground">Recevoir un rappel par e-mail avant chaque séance</p>
                      </div>
                      <Switch checked={reminderEmail} onCheckedChange={setReminderEmail} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">📱 Rappel par SMS</p>
                        <p className="text-[10px] text-muted-foreground">Recevoir un rappel par SMS avant chaque séance</p>
                      </div>
                      <Switch checked={reminderSms} onCheckedChange={setReminderSms} />
                    </div>
                  </div>
                  {(reminderSms !== (clientProfile?.reminder_sms ?? false) || reminderEmail !== (clientProfile?.reminder_email ?? true)) && (
                    <Button size="sm" className="text-xs mt-2" onClick={saveProfile}>Sauvegarder</Button>
                  )}
                </div>

                <div className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
                  <p className="text-sm font-medium">Téléphone</p>
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" />
                  {phone !== (clientProfile?.phone || "") && (
                    <Button size="sm" className="text-xs gap-1.5" onClick={savePhone} disabled={savingPhone}>
                      {savingPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Sauvegarder
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border bg-card p-4 md:p-6 space-y-3">
                  <p className="text-sm font-medium">Changer le mot de passe</p>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" />
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" />
                  <Button size="sm" className="text-xs gap-1.5" onClick={savePassword} disabled={savingPassword || !newPassword}>
                    {savingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Changer le mot de passe
                  </Button>
                </div>

                {/* Déconnexion */}
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={async () => { await signOut(); navigate("/"); }}
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Contact Elodie banner */}
          <div className="max-w-3xl mt-8 rounded-xl border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-primary-dark">Une question ?</p>
              <p className="text-xs text-muted-foreground">Contactez Élodie pour toute demande personnalisée.</p>
            </div>
            <ContactElodieButton variant="outline" className="text-xs" />
          </div>
        </>

      )}

      {/* Reservation detail sheet */}
      <Sheet open={!!viewingReservation} onOpenChange={(open) => !open && setViewingReservation(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {viewingReservation && (() => {
            const r = viewingReservation;
            const todayStr = todayLocalStr();
            const isFuture = r.date >= todayStr;
            const isConfirmed = r.status === "confirmé";
            const isPottery = r.activity_type === "workshop" && isPotteryActivity(r.activity_name);
            const canCancel = !isPottery && isConfirmed && isFuture && !!r.time && getCancelEligibility(r.date, r.time).canCancel;
            return (
              <>
                <SheetHeader className="text-left">
                  <Badge variant="outline" className={`w-fit text-[10px] ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                  <SheetTitle className="font-display text-xl">{r.activity_name}</SheetTitle>
                </SheetHeader>
                <div className="space-y-3 pt-2 pb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(r.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{r.time}{r.end_time ? ` - ${r.end_time}` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Type : {r.activity_type === "course" ? "Cours" : "Atelier"}</span>
                  </div>
                  {groupParticipants.length > 1 && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="h-3.5 w-3.5 text-primary-dark" />
                        <span className="text-xs font-semibold text-primary-dark">Participants ({groupParticipants.length})</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {groupParticipants.map((name) => <li key={name}>• {name}</li>)}
                      </ul>
                    </div>
                  )}
                  {activityModalities && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-primary-dark" />
                        <span className="text-xs font-semibold text-primary-dark">Modalités & consignes</span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{activityModalities}</p>
                    </div>
                  )}
                  {isConfirmed && isFuture && !isPottery && (
                      <div className="pt-2 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 gap-1.5"
                            disabled={!canCancel}
                            onClick={() => openReschedule(r)}
                          >
                            <RefreshCw className="h-4 w-4" /> Reprogrammer
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1 gap-1.5"
                            disabled={!canCancel}
                            onClick={() => setCancelConfirm(r)}
                          >
                            <XCircle className="h-4 w-4" /> Annuler
                          </Button>
                        </div>
                        {!canCancel && (
                          <p className="text-xs text-muted-foreground text-center">
                            Annulation et reprogrammation possibles jusqu'à 12h avant le cours.
                          </p>
                        )}
                      </div>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Reschedule sheet */}
      <Sheet open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Choisir une nouvelle date</SheetTitle>
          </SheetHeader>
          <div className="pt-2 pb-6 space-y-2">
            {rescheduleLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : rescheduleOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun autre créneau disponible pour le moment.</p>
            ) : (
              rescheduleOptions.map((opt) => (
                <button
                  key={`${opt.date}-${opt.time}`}
                  type="button"
                  disabled={rescheduleSaving}
                  onClick={() => confirmReschedule(opt)}
                  className="w-full flex items-center justify-between rounded-lg border bg-card p-3 text-left hover:bg-muted/40 transition-colors disabled:opacity-50"
                >
                  <span className="text-sm capitalize">
                    {new Date(opt.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {opt.time}
                  </span>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={(open) => !open && setCancelConfirm(null)}>
        <AlertDialogContent>
          {cancelConfirm && (() => {
            const { canCancel, hoursUntil } = getCancelEligibility(cancelConfirm.date, cancelConfirm.time);
            const hoursText = Math.floor(hoursUntil) + "h";
            const willRefundCard = canCancel && cancelConfirm.activity_type === "course" && cancelConfirm.payment_method === "Carte du compte";
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      {willRefundCard && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <p className="text-sm text-foreground">
                            Vous avez <strong>{totalCredits}</strong> cours de disponible{totalCredits > 1 ? "s" : ""}. Après annulation, vous aurez <strong>{totalCredits + 1}</strong> cours de disponible{totalCredits + 1 > 1 ? "s" : ""}.
                          </p>
                        </div>
                      )}
                      {canCancel ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <p className="text-sm text-foreground">
                            Vous annulez <strong>{hoursText}</strong> avant l'atelier, vous serez remboursé(e)s si vous avez payé(e)s.
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                          <p className="text-sm text-foreground">
                            Votre annulation intervient moins de <strong>12h</strong> avant la séance. Conformément aux conditions générales, votre annulation ne sera pas remboursée.
                          </p>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground">
                        En annulant, nous espérons que vous allez bien, et, nous vous remercions de prévenir l'intervenant. À bientôt ❤️
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Retour</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleCancelReservation(cancelConfirm)}>
                    Confirmer l'annulation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      {/* Welcome popup after booking */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-primary-dark">
              Inscription validée ! 🎉
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nous avons hâte de vous voir. Vous voici dans <strong>votre espace client</strong>.
            </p>
            <Button className="w-full" onClick={() => setShowWelcome(false)}>
              Ok
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mock Stripe Modal */}
      <MockStripeModal
        open={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        onSuccess={handleStripeSuccess}
        amount={stripeAmount}
        description={stripeDescription}
      />
    </ClientLayout>
  );
}
