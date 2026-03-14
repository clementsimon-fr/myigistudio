import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, CreditCard, Clock, LogOut, Plus, Loader2, User, MessageSquare, Send, Pencil, XCircle, Star, ArrowRight, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reservation { id: string; client_name: string; activity_name: string; activity_type: string; date: string; time: string; end_time: string; participants: number; status: string; created_at: string; }
interface ClientCard { id: string; client_name: string; card_name: string; total_sessions: number; used_sessions: number; expires_at: string; }
interface Profile { id: string; user_name: string; bio: string; show_in_community: boolean; avatar_url: string; reminder_sms: boolean; reminder_email: boolean; }
interface ForumPost { id: string; author_name: string; category: string; content: string; created_at: string; }

const statusColors: Record<string, string> = {
  "confirmé": "bg-primary/15 text-primary-dark border-primary/30",
  "annulé": "bg-destructive/10 text-destructive border-destructive/30",
  "liste d'attente": "bg-accent/20 text-accent-foreground border-accent/30",
};
const FORUM_CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "yoga", label: "Yoga & Pilates" },
  { value: "poterie", label: "Poterie" },
  { value: "ateliers", label: "Ateliers" },
];
const CLIENT_NAME = "Sophie";

type Section = "reservations" | "cartes" | "profil" | "communaute" | "feedback";

const NAV_ITEMS: { value: Section; label: string; icon: typeof CalendarDays }[] = [
  { value: "reservations", label: "Résa", icon: CalendarDays },
  { value: "cartes", label: "Cartes Yoga", icon: CreditCard },
  { value: "communaute", label: "Forum", icon: MessageSquare },
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
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [communityMembers, setCommunityMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [showInCommunity, setShowInCommunity] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("general");
  const [forumFilter, setForumFilter] = useState("all");
  const [resFilter, setResFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resR, resC, resP, resF, resCom] = await Promise.all([
        supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false }),
        supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("user_name", CLIENT_NAME).maybeSingle(),
        supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("*").eq("show_in_community", true).order("user_name"),
      ]);
      if (resR.data) setReservations(resR.data as unknown as Reservation[]);
      if (resC.data) setCards(resC.data as unknown as ClientCard[]);
      if (resP.data) { setProfile(resP.data as unknown as Profile); setBioValue((resP.data as any).bio || ""); setShowInCommunity((resP.data as any).show_in_community || false); }
      if (resF.data) setForumPosts(resF.data as unknown as ForumPost[]);
      if (resCom.data) setCommunityMembers(resCom.data as unknown as Profile[]);
      setLoading(false);
    };
    load();
  }, []);

  const yogaRes = reservations.filter(r => r.activity_type === "course");
  const potteryRes = reservations.filter(r => r.activity_type === "workshop" && (r.activity_name.toLowerCase().includes("poterie") || r.activity_name.toLowerCase().includes("tour") || r.activity_name.toLowerCase().includes("modelage")));
  const atelierRes = reservations.filter(r => r.activity_type === "workshop" && !potteryRes.includes(r));
  const upcomingRes = reservations.filter(r => r.status === "confirmé" && r.date >= new Date().toISOString().split("T")[0]);
  const totalCredits = cards.reduce((sum, c) => sum + (c.total_sessions - c.used_sessions), 0);

  const filteredRes = resFilter === "all" ? reservations : resFilter === "yoga" ? yogaRes : resFilter === "poterie" ? potteryRes : atelierRes;

  const saveProfile = async () => {
    if (profile) await supabase.from("profiles").update({ bio: bioValue, show_in_community: showInCommunity }).eq("id", profile.id);
    else await supabase.from("profiles").insert({ user_name: CLIENT_NAME, bio: bioValue, show_in_community: showInCommunity });
    setEditingBio(false);
    toast({ title: "Profil mis à jour ✓" });
  };

  const postToForum = async () => {
    if (!newPostContent.trim()) return;
    await supabase.from("forum_posts").insert({ author_name: CLIENT_NAME, category: newPostCategory, content: newPostContent.trim() });
    setNewPostContent("");
    const { data } = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setForumPosts(data as unknown as ForumPost[]);
    toast({ title: "Message publié ✓" });
  };

  const filteredPosts = forumFilter === "all" ? forumPosts : forumPosts.filter(p => p.category === forumFilter);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-8">
        <div className="container max-w-4xl py-4 md:py-8 px-4">
          {/* Header - compact on mobile */}
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

          {/* Desktop sidebar nav */}
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
                        // Check if cancellation is allowed (12h before)
                        const isConfirmed = r.status === "confirmé";
                        const todayStr = new Date().toISOString().split("T")[0];
                        const isFuture = r.date >= todayStr;
                        let canCancel = false;
                        if (isConfirmed && isFuture && r.time) {
                          const [h, m] = r.time.split(":").map(Number);
                          const courseStart = new Date(r.date + "T00:00:00");
                          courseStart.setHours(h, m, 0, 0);
                          const hoursUntil = (courseStart.getTime() - Date.now()) / (1000 * 60 * 60);
                          canCancel = hoursUntil >= 12;
                        }

                        const handleCancel = async () => {
                          await supabase.from("reservations").update({ status: "annulé" }).eq("id", r.id);
                          // Re-credit spots
                          if (r.activity_type === "course") {
                            // Find schedule to re-credit - we don't have schedule_id in the Reservation type here
                            // so we just refetch
                          }
                          toast({ title: "Réservation annulée" });
                          // Reload
                          const { data } = await supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false });
                          if (data) setReservations(data as unknown as Reservation[]);
                        };

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

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Ma bio</Label>
                        {!editingBio && <Button variant="ghost" size="sm" className="gap-1 h-6 text-xs" onClick={() => setEditingBio(true)}><Pencil className="h-3 w-3" /> Modifier</Button>}
                      </div>
                      {editingBio ? (
                        <div className="space-y-2">
                          <Textarea value={bioValue} onChange={e => setBioValue(e.target.value)} rows={3} placeholder="Présentez-vous..." className="text-sm" />
                          <div className="flex gap-2">
                            <Button size="sm" className="text-xs" onClick={saveProfile}>Enregistrer</Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditingBio(false)}>Annuler</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{bioValue || "Aucune bio pour le moment."}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Visibilité communauté</p>
                        <p className="text-[10px] text-muted-foreground">Les membres verront votre profil</p>
                      </div>
                      <Switch checked={showInCommunity} onCheckedChange={setShowInCommunity} />
                    </div>
                    {showInCommunity !== (profile?.show_in_community ?? false) && (
                      <Button size="sm" className="text-xs mt-2" onClick={saveProfile}>Sauvegarder</Button>
                    )}
                  </div>
                </div>
              )}

              {/* ─── COMMUNAUTÉ ─── */}
              {section === "communaute" && (
                <div className="space-y-4">
                  {/* Members */}
                  {communityMembers.length > 0 && (
                    <div>
                      <h3 className="text-xs font-medium text-muted-foreground mb-2">Membres actifs</h3>
                      <div className="flex flex-wrap gap-2">
                        {communityMembers.map(m => (
                          <div key={m.id} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 bg-card text-xs">
                            <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                              <User className="h-2.5 w-2.5 text-primary-dark" />
                            </div>
                            <span className="font-medium">{m.user_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New post */}
                  <div className="rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex gap-2">
                      <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{FORUM_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)} rows={2} placeholder="Partagez avec la communauté..." className="text-sm" />
                    <Button size="sm" className="gap-1 text-xs" onClick={postToForum} disabled={!newPostContent.trim()}>
                      <Send className="h-3 w-3" /> Publier
                    </Button>
                  </div>

                  {/* Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant={forumFilter === "all" ? "default" : "outline"} className="rounded-full text-xs h-7" onClick={() => setForumFilter("all")}>Tous</Button>
                    {FORUM_CATEGORIES.map(c => (
                      <Button key={c.value} size="sm" variant={forumFilter === c.value ? "default" : "outline"} className="rounded-full text-xs h-7" onClick={() => setForumFilter(c.value)}>{c.label}</Button>
                    ))}
                  </div>

                  {/* Posts */}
                  <div className="space-y-2">
                    {filteredPosts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Aucun message. Soyez le premier !</p>
                    ) : filteredPosts.map(post => (
                      <div key={post.id} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                              <User className="h-3 w-3 text-primary-dark" />
                            </div>
                            <span className="text-xs font-medium">{post.author_name}</span>
                            <Badge variant="outline" className="text-[10px]">{FORUM_CATEGORIES.find(c => c.value === post.category)?.label || post.category}</Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-line">{post.content}</p>
                      </div>
                    ))}
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

      {/* Bottom nav removed — navigation is now in the top Navbar menu */}

      <Footer />
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
