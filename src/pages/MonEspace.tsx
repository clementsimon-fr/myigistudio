import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CalendarDays, CreditCard, Clock, LogOut, Plus, Loader2, User, Send, Pencil, XCircle, Star, ArrowRight, Bell, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reservation { id: string; client_name: string; activity_name: string; activity_type: string; date: string; time: string; end_time: string; participants: number; status: string; created_at: string; course_id: string | null; workshop_id: string | null; }
interface ClientCard { id: string; client_name: string; card_name: string; total_sessions: number; used_sessions: number; expires_at: string; }
interface Profile { id: string; user_name: string; bio: string; show_in_community: boolean; avatar_url: string; reminder_sms: boolean; reminder_email: boolean; }

const statusColors: Record<string, string> = {
  "confirmé": "bg-primary/15 text-primary-dark border-primary/30",
  "annulé": "bg-destructive/10 text-destructive border-destructive/30",
  "liste d'attente": "bg-accent/20 text-accent-foreground border-accent/30",
};
const CLIENT_NAME = "Sophie";

type Section = "reservations" | "cartes" | "cadeaux" | "profil" | "feedback";

const NAV_ITEMS: { value: Section; label: string; icon: typeof CalendarDays }[] = [
  { value: "reservations", label: "Réservations", icon: CalendarDays },
  { value: "cartes", label: "Cartes Yoga", icon: CreditCard },
  { value: "cadeaux", label: "Bons Cadeaux", icon: Star },
  { value: "feedback", label: "Feedback", icon: Star },
  { value: "profil", label: "Profil", icon: User },
];

export default function MonEspace() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const sectionParam = searchParams.get("section") as Section | null;
  const [section, setSection] = useState<Section>(sectionParam || "reservations");

  useEffect(() => {
    if (sectionParam && sectionParam !== section) setSection(sectionParam);
  }, [sectionParam]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [showInCommunity, setShowInCommunity] = useState(false);
  const [reminderSms, setReminderSms] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(true);
  const [resFilter, setResFilter] = useState("all");
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Reservation | null>(null);
  const [activityModalities, setActivityModalities] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resR, resC, resP] = await Promise.all([
        supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false }),
        supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("user_name", CLIENT_NAME).maybeSingle(),
      ]);
      if (resR.data) setReservations(resR.data as unknown as Reservation[]);
      if (resC.data) setCards(resC.data as unknown as ClientCard[]);
      if (resP.data) { setProfile(resP.data as unknown as Profile); setBioValue((resP.data as any).bio || ""); setShowInCommunity((resP.data as any).show_in_community || false); setReminderSms((resP.data as any).reminder_sms || false); setReminderEmail((resP.data as any).reminder_email ?? true); }
      setLoading(false);
    };
    load();
  }, []);

  // Fetch modalities when viewing a reservation
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

  const yogaRes = reservations.filter(r => r.activity_type === "course");
  const potteryRes = reservations.filter(r => r.activity_type === "workshop" && (r.activity_name.toLowerCase().includes("poterie") || r.activity_name.toLowerCase().includes("tour") || r.activity_name.toLowerCase().includes("modelage")));
  const atelierRes = reservations.filter(r => r.activity_type === "workshop" && !potteryRes.includes(r));

  const filteredRes = resFilter === "all" ? reservations : resFilter === "yoga" ? yogaRes : resFilter === "poterie" ? potteryRes : atelierRes;

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

  // Compute cancellation info for the cancelConfirm reservation
  const getCancelInfo = (r: Reservation) => {
    const [h, m] = r.time.split(":").map(Number);
    const courseStart = new Date(r.date + "T00:00:00");
    courseStart.setHours(h, m, 0, 0);
    const hoursUntil = (courseStart.getTime() - Date.now()) / (1000 * 60 * 60);
    const canCancel = hoursUntil >= 12;
    const hoursText = Math.floor(hoursUntil) + "h";
    return { canCancel, hoursText };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-8">
        <div className="container max-w-4xl py-4 md:py-8 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-primary/15 flex items-center justify-center">
                <User className="h-5 w-5 md:h-6 md:w-6 text-primary-dark" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-display font-bold text-primary-dark">Mon Espace</h1>
                <p className="text-muted-foreground text-xs md:text-sm">Bonjour {CLIENT_NAME} 👋</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Link to="/calendrier"><Button size="sm" className="gap-1 text-xs md:text-sm"><Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Réserver</span></Button></Link>
              <Button size="sm" variant="ghost" onClick={() => navigate("/login")} className="gap-1 text-xs text-muted-foreground"><LogOut className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex gap-2 mb-6 border-b pb-3">
            {NAV_ITEMS.map(item => (
              <Button key={item.value} variant={section === item.value ? "default" : "ghost"} size="sm" className="gap-1.5" onClick={() => setSection(item.value)}>
                <item.icon className="h-4 w-4" /> {item.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* ─── RÉSERVATIONS ─── */}
              {section === "reservations" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { v: "all", l: `Toutes (${reservations.length})` },
                      { v: "yoga", l: `Yoga (${yogaRes.length})` },
                      { v: "poterie", l: `Poterie (${potteryRes.length})` },
                      { v: "ateliers", l: `Ateliers (${atelierRes.length})` },
                    ].map(f => (
                      <Button key={f.v} size="sm" variant={resFilter === f.v ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setResFilter(f.v)}>{f.l}</Button>
                    ))}
                  </div>
                  {filteredRes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune réservation dans cette catégorie.</p>
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

              {/* ─── CARTES ─── */}
              {section === "cartes" && (
                <div className="space-y-3">
                  {cards.length === 0 ? (
                    <div className="text-center py-12"><p className="text-muted-foreground text-sm">Aucune carte active.</p></div>
                  ) : cards.map(card => {
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
                            <div className="h-full rounded-full bg-primary-dark transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium">{card.used_sessions}/{card.total_sessions}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{remaining} crédit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ─── BONS CADEAUX ─── */}
              {section === "cadeaux" && (
                <GiftVoucherSection clientName={CLIENT_NAME} />
              )}

              {/* ─── PROFIL ─── */}
              {section === "profil" && (
                <div className="space-y-4">
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

                    {/* Reminder preferences */}
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
                </div>
              )}
            </>
          )}

          {/* ── FEEDBACK ── */}
          {section === "feedback" && (
            <FeedbackSection clientName={CLIENT_NAME} />
          )}
        </div>
      </main>

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

                  {/* Modalités */}
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
            const { canCancel, hoursText } = getCancelInfo(cancelConfirm);
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
                            Votre annulation intervient moins de <strong>12h</strong> avant la séance. Conformément aux conditions générales que vous avez accepté(e)s, votre annulation ne sera pas remboursée.
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
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleCancelReservation(cancelConfirm)}
                  >
                    Confirmer l'annulation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function GiftVoucherSection({ clientName }: { clientName: string }) {
  const [vouchers, setVouchers] = useState<{ id: string; code: string; type: string; amount: number; sessions: number; card_name: string; message: string; used: boolean; expires_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("gift_vouchers").select("*").eq("beneficiary_name", clientName).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setVouchers(data as any);
      setLoading(false);
    });
  }, [clientName]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-display font-bold text-primary-dark">Mes bons cadeaux</h2>
      {vouchers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun bon cadeau pour le moment.</p>
      ) : vouchers.map(v => (
        <div key={v.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-primary-dark">{v.card_name || (v.type === "amount" ? `Bon de ${v.amount}€` : `${v.sessions} séances`)}</h3>
            <Badge variant={v.used ? "secondary" : "default"} className="text-xs">{v.used ? "Utilisé" : "Actif"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">Code : <span className="font-mono font-medium">{v.code}</span></p>
          <p className="text-xs text-muted-foreground">Expire le {new Date(v.expires_at).toLocaleDateString("fr-FR")}</p>
          {v.message && <p className="text-xs text-muted-foreground mt-1 italic">"{v.message}"</p>}
        </div>
      ))}
    </div>
  );
}

function FeedbackSection({ clientName }: { clientName: string }) {
  const { toast } = useToast();
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<{ id: string; message: string; rating: number; created_at: string }[]>([]);

  useEffect(() => {
    supabase.from("feedbacks").select("*").eq("author_name", clientName).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setFeedbacks(data as any);
    });
  }, [clientName]);

  const submit = async () => {
    if (!feedbackMsg.trim()) return;
    setSubmitting(true);
    await supabase.from("feedbacks").insert({ author_name: clientName, message: feedbackMsg, rating } as any);
    toast({ title: "Merci pour votre retour ! 🙏" });
    setFeedbackMsg("");
    setRating(5);
    setSubmitting(false);
    const { data } = await supabase.from("feedbacks").select("*").eq("author_name", clientName).order("created_at", { ascending: false });
    if (data) setFeedbacks(data as any);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-bold text-primary-dark">Votre avis compte !</h2>
      <p className="text-sm text-muted-foreground">Aidez-nous à améliorer votre expérience en partageant vos idées et suggestions.</p>

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div>
          <Label className="text-sm">Note</Label>
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)} className="focus:outline-none">
                <Star className={`h-6 w-6 transition-colors ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm">Votre message</Label>
          <Textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} rows={3} placeholder="Ce que vous aimez, ce qu'on pourrait améliorer..." className="mt-1" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={submit} disabled={!feedbackMsg.trim() || submitting}>
          <Send className="h-3.5 w-3.5" /> Envoyer
        </Button>
      </div>

      {feedbacks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Vos retours précédents</h3>
          {feedbacks.map(fb => (
            <div key={fb.id} className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: fb.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm">{fb.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(fb.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
