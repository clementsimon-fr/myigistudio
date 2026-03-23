import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, CreditCard, Clock, Loader2, User, Pencil, XCircle, ArrowRight, Bell, MapPin, ShoppingCart, Star, Gift, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDemoContext } from "@/contexts/DemoContext";
import ClientLayout from "@/components/client/ClientLayout";
import MockStripeModal from "@/components/demo/MockStripeModal";
import ContactElodieButton from "@/components/ContactElodieButton";
import { cn } from "@/lib/utils";

interface Reservation { id: string; client_name: string; activity_name: string; activity_type: string; date: string; time: string; end_time: string; participants: number; status: string; created_at: string; course_id: string | null; workshop_id: string | null; }
interface ClientCard { id: string; client_name: string; card_name: string; total_sessions: number; used_sessions: number; expires_at: string; }
interface Profile { id: string; user_name: string; bio: string; show_in_community: boolean; avatar_url: string; reminder_sms: boolean; reminder_email: boolean; }
interface PricingCard { id: string; name: string; sessions: number; price: number; validity: string; popular: boolean; sort_order: number; payment_info: string; }

const statusColors: Record<string, string> = {
  "confirmé": "bg-primary/15 text-primary-dark border-primary/30",
  "annulé": "bg-destructive/10 text-destructive border-destructive/30",
  "liste d'attente": "bg-accent/20 text-accent-foreground border-accent/30",
};

type Section = "reservations" | "cartes" | "profil";

export default function MonEspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentProfile, addCredits, addNotification } = useDemoContext();
  const CLIENT_NAME = currentProfile?.name || "Sophie";
  const sectionParam = searchParams.get("section") as Section | null;
  const isWelcome = searchParams.get("welcome") === "1";
  const [section, setSection] = useState<Section>(sectionParam || "reservations");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (isWelcome) {
      setShowWelcome(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("welcome");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [isWelcome]);

  useEffect(() => {
    if (sectionParam && sectionParam !== section) setSection(sectionParam);
  }, [sectionParam]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminderSms, setReminderSms] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(true);
  const [resFilter, setResFilter] = useState("all");
  const [showBuyCards, setShowBuyCards] = useState(false);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Reservation | null>(null);
  const [activityModalities, setActivityModalities] = useState<string>("");
  const [pricingCards, setPricingCards] = useState<PricingCard[]>([]);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeDescription, setStripeDescription] = useState("");
  const [selectedPricingCard, setSelectedPricingCard] = useState<PricingCard | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resR, resC, resP, resPC] = await Promise.all([
        supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false }),
        supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("user_name", CLIENT_NAME).maybeSingle(),
        supabase.from("pricing_cards").select("*").order("sort_order"),
      ]);
      if (resR.data) setReservations(resR.data as unknown as Reservation[]);
      if (resC.data) setCards(resC.data as unknown as ClientCard[]);
      if (resP.data) { setProfile(resP.data as unknown as Profile); setReminderSms((resP.data as any).reminder_sms || false); setReminderEmail((resP.data as any).reminder_email ?? true); }
      if (resPC.data) setPricingCards(resPC.data as unknown as PricingCard[]);
      setLoading(false);
    };
    load();
  }, [CLIENT_NAME]);

  useEffect(() => {
    if (!viewingReservation) { setActivityModalities(""); return; }
    const fetchModalities = async () => {
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
    };
    fetchModalities();
  }, [viewingReservation]);

  // 1.11: Only count confirmed reservations (exclude cancelled)
  const confirmedRes = reservations.filter(r => r.status !== "annulé");
  const yogaRes = confirmedRes.filter(r => r.activity_type === "course");
  const potteryRes = confirmedRes.filter(r => r.activity_type === "workshop" && (r.activity_name.toLowerCase().includes("poterie") || r.activity_name.toLowerCase().includes("tour") || r.activity_name.toLowerCase().includes("modelage")));
  const atelierRes = confirmedRes.filter(r => r.activity_type === "workshop" && !potteryRes.includes(r));
  const filteredRes = resFilter === "all" ? confirmedRes : resFilter === "yoga" ? yogaRes : resFilter === "poterie" ? potteryRes : atelierRes;

  const saveProfile = async () => {
    if (profile) await supabase.from("profiles").update({ reminder_sms: reminderSms, reminder_email: reminderEmail } as any).eq("id", profile.id);
    else await supabase.from("profiles").insert({ user_name: CLIENT_NAME, reminder_sms: reminderSms, reminder_email: reminderEmail } as any);
    toast({ title: "Profil mis à jour ✓" });
  };

  const handleCancelReservation = async (r: Reservation) => {
    await supabase.from("reservations").update({ status: "annulé" }).eq("id", r.id);
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
    addCredits(selectedPricingCard.sessions, selectedPricingCard.name);
    addNotification(`${CLIENT_NAME} vient d'acheter une ${selectedPricingCard.name}`, "purchase");
    // Create card in DB
    await supabase.from("client_cards").insert({
      client_name: CLIENT_NAME,
      card_name: selectedPricingCard.name,
      total_sessions: selectedPricingCard.sessions,
      used_sessions: 0,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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

  const sectionTitle = section === "reservations" ? "Réservations" : section === "cartes" ? "Cartes Yoga" : "Profil";

  return (
    <ClientLayout title={sectionTitle}>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* ─── RÉSERVATIONS ─── */}
          {section === "reservations" && (
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-display font-semibold text-primary-dark">Mes réservations</h2>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: "all", l: `Toutes (${confirmedRes.length})` },
                  { v: "yoga", l: `Yoga (${yogaRes.length})` },
                  { v: "poterie", l: `Poterie (${potteryRes.length})` },
                  { v: "ateliers", l: `Ateliers (${atelierRes.length})` },
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
                    const todayStr = new Date().toISOString().split("T")[0];
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
          )}

          {/* ─── CARTES YOGA ─── */}
          {section === "cartes" && (
            <div className="max-w-3xl space-y-6">
              {/* Summary */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between">
              <div>
                    <h2 className="text-lg font-display font-semibold text-primary-dark">Mes cartes Yoga</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous avez <strong className="text-primary-dark">{totalCredits}</strong> carte{totalCredits > 1 ? "s" : ""} yoga disponible{totalCredits > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-full bg-[hsl(210,60%,55%)]/10 flex items-center justify-center">
                    <CreditCard className="h-7 w-7 text-[hsl(210,60%,55%)]" />
                  </div>
                </div>
              </div>

              {/* Active cards */}
              <div>
                <h3 className="text-sm font-semibold text-primary-dark mb-3">Cartes actives</h3>
                {cards.length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-dashed">
                    <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune carte active.</p>
                    <p className="text-xs text-muted-foreground mt-1">Achetez une carte ci-dessous pour commencer.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cards.map(card => {
                      const remaining = card.total_sessions - card.used_sessions;
                      const pct = (card.used_sessions / card.total_sessions) * 100;
                      return (
                        <div key={card.id} className="rounded-xl border bg-card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm text-primary-dark">{card.card_name}</h3>
                            <span className="text-[10px] md:text-xs text-muted-foreground">Exp. {new Date(card.expires_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-[hsl(210,60%,55%)] transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium">{card.used_sessions}/{card.total_sessions}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{remaining} carte{remaining > 1 ? "s" : ""} yoga restante{remaining > 1 ? "s" : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 1.5: Button to reveal buying section */}
              <div>
                <Button variant="outline" className="w-full gap-2" onClick={() => setShowBuyCards(!showBuyCards)}>
                  <ShoppingCart className="h-4 w-4" /> {showBuyCards ? "Masquer les formules" : "Ajouter cartes yoga"}
                </Button>
                {showBuyCards && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-primary-dark mb-3">Choisir une formule</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pricingCards.map(card => {
                        const perSession = card.sessions > 0 && card.sessions < 9999 ? card.price / card.sessions : null;
                        return (
                          <div
                            key={card.id}
                            className={cn(
                              "relative rounded-xl border p-5 bg-card flex flex-col cursor-pointer transition-all hover:shadow-md",
                              card.popular ? "border-[hsl(210,60%,55%)] shadow-lg ring-2 ring-[hsl(210,60%,55%)]/20" : "hover:border-[hsl(210,60%,55%)]/40"
                            )}
                            onClick={() => handleBuyCard(card)}
                          >
                            {card.popular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <Star className="h-3 w-3" /> Populaire
                              </div>
                            )}
                            <h3 className="font-display font-semibold text-lg text-primary-dark">{card.name}</h3>
                            <div className="mt-3 mb-1">
                              <span className="text-3xl font-bold text-foreground">{card.price}€</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              {card.sessions >= 9999 ? "Illimité" : `${card.sessions} cours`} · {card.validity}
                            </p>
                            {perSession !== null && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {perSession.toFixed(2)}€ / cours
                              </p>
                            )}
                            {card.payment_info && <p className="text-xs text-[hsl(210,60%,55%)] italic mb-3">{card.payment_info}</p>}
                            <div className="mt-auto pt-3">
                              <Button className={cn("w-full", card.popular ? "bg-[hsl(210,60%,55%)] hover:bg-[hsl(210,60%,45%)] text-white" : "")} variant={card.popular ? "default" : "outline"}>
                                <ShoppingCart className="h-4 w-4 mr-1.5" /> Acheter
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <ContactElodieButton variant="outline" className="text-xs" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── PROFIL ─── */}
          {section === "profil" && (
            <div className="max-w-lg space-y-4">
              <div className="rounded-xl border bg-card p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                    <User className="h-7 w-7 text-primary-dark" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-primary-dark">{CLIENT_NAME}</h3>
                    <p className="text-xs text-muted-foreground">
                      Membre depuis {reservations.length > 0 ? new Date(reservations[reservations.length - 1]?.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "récemment"}
                    </p>
                  </div>
                </div>
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
                {(reminderSms !== (profile?.reminder_sms ?? false) || reminderEmail !== (profile?.reminder_email ?? true)) && (
                  <Button size="sm" className="text-xs mt-2" onClick={saveProfile}>Sauvegarder</Button>
                )}
              </div>

              {/* Déconnexion */}
              <Button
                variant="outline"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { setCurrentProfile(null); navigate("/"); }}
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Button>
            </div>
          )}
        </>
      )}

      {/* Reservation detail dialog */}
      <Dialog open={!!viewingReservation} onOpenChange={(open) => !open && setViewingReservation(null)}>
        <DialogContent className="sm:max-w-md">
          {viewingReservation && (() => {
            const r = viewingReservation;
            const todayStr = new Date().toISOString().split("T")[0];
            const isFuture = r.date >= todayStr;
            const isConfirmed = r.status === "confirmé";
            let canCancel = false;
            if (isConfirmed && isFuture && r.time) {
              const [h, m] = r.time.split(":").map(Number);
              const courseStart = new Date(r.date + "T00:00:00");
              courseStart.setHours(h, m, 0, 0);
              const hoursUntil = (courseStart.getTime() - Date.now()) / (1000 * 60 * 60);
              canCancel = hoursUntil >= 12;
            }
            return (
              <>
                <DialogHeader>
                  <Badge variant="outline" className={`w-fit text-[10px] ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                  <DialogTitle className="font-display text-xl">{r.activity_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(r.date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{r.time}{r.end_time ? ` - ${r.end_time}` : ""}</span>
                  </div>
                  {r.participants > 1 && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{r.participants} participant{r.participants > 1 ? "s" : ""}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Type : {r.activity_type === "course" ? "Cours" : "Atelier"}</span>
                  </div>
                  {activityModalities && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-primary-dark" />
                        <span className="text-xs font-semibold text-primary-dark">Modalités & consignes</span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{activityModalities}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {isConfirmed && isFuture && (
                      <Button variant="destructive" className="flex-1 gap-1.5" onClick={() => setCancelConfirm(r)}>
                        <XCircle className="h-4 w-4" /> Annuler la réservation
                      </Button>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelConfirm} onOpenChange={(open) => !open && setCancelConfirm(null)}>
        <AlertDialogContent>
          {cancelConfirm && (() => {
            const [h, m] = cancelConfirm.time.split(":").map(Number);
            const courseStart = new Date(cancelConfirm.date + "T00:00:00");
            courseStart.setHours(h, m, 0, 0);
            const hoursUntil = (courseStart.getTime() - Date.now()) / (1000 * 60 * 60);
            const canCancel = hoursUntil >= 12;
            const hoursText = Math.floor(hoursUntil) + "h";
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
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
