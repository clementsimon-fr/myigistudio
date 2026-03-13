import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, CreditCard, Clock, LogOut, Plus, Loader2, User, MessageSquare, Send, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reservation {
  id: string;
  client_name: string;
  activity_name: string;
  activity_type: string;
  date: string;
  time: string;
  end_time: string;
  participants: number;
  status: string;
  created_at: string;
}

interface ClientCard {
  id: string;
  client_name: string;
  card_name: string;
  total_sessions: number;
  used_sessions: number;
  expires_at: string;
}

interface Profile {
  id: string;
  user_name: string;
  bio: string;
  show_in_community: boolean;
  avatar_url: string;
}

interface ForumPost {
  id: string;
  author_name: string;
  category: string;
  content: string;
  created_at: string;
}

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

const CLIENT_NAME = "Sophie"; // placeholder until auth

export default function MonEspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [cards, setCards] = useState<ClientCard[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [communityMembers, setCommunityMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [showInCommunity, setShowInCommunity] = useState(false);

  // Forum
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState("general");
  const [forumFilter, setForumFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [resReservations, resCards, resProfile, resForum, resCommunity] = await Promise.all([
        supabase.from("reservations").select("*").eq("client_name", CLIENT_NAME).order("date", { ascending: false }),
        supabase.from("client_cards").select("*").eq("client_name", CLIENT_NAME).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").eq("user_name", CLIENT_NAME).maybeSingle(),
        supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("*").eq("show_in_community", true).order("user_name"),
      ]);
      if (resReservations.data) setReservations(resReservations.data as unknown as Reservation[]);
      if (resCards.data) setCards(resCards.data as unknown as ClientCard[]);
      if (resProfile.data) {
        setProfile(resProfile.data as unknown as Profile);
        setBioValue((resProfile.data as any).bio || "");
        setShowInCommunity((resProfile.data as any).show_in_community || false);
      }
      if (resForum.data) setForumPosts(resForum.data as unknown as ForumPost[]);
      if (resCommunity.data) setCommunityMembers(resCommunity.data as unknown as Profile[]);
      setLoading(false);
    };
    load();
  }, []);

  // Reservation filters
  const yogaReservations = reservations.filter(r => r.activity_type === "course");
  const potteryReservations = reservations.filter(r => r.activity_type === "workshop" && r.activity_name.toLowerCase().includes("poterie") || r.activity_name.toLowerCase().includes("tour") || r.activity_name.toLowerCase().includes("modelage") || r.activity_name.toLowerCase().includes("émaillage") || r.activity_name.toLowerCase().includes("céramique"));
  const atelierReservations = reservations.filter(r => r.activity_type === "workshop" && !potteryReservations.includes(r));

  const upcomingReservations = reservations.filter(
    r => r.status === "confirmé" && r.date >= new Date().toISOString().split("T")[0]
  );
  const totalCredits = cards.reduce((sum, c) => sum + (c.total_sessions - c.used_sessions), 0);

  const saveProfile = async () => {
    if (profile) {
      await supabase.from("profiles").update({ bio: bioValue, show_in_community: showInCommunity }).eq("id", profile.id);
    } else {
      await supabase.from("profiles").insert({ user_name: CLIENT_NAME, bio: bioValue, show_in_community: showInCommunity });
    }
    setEditingBio(false);
    toast({ title: "Profil mis à jour ✓" });
  };

  const postToForum = async () => {
    if (!newPostContent.trim()) return;
    await supabase.from("forum_posts").insert({
      author_name: CLIENT_NAME,
      category: newPostCategory,
      content: newPostContent.trim(),
    });
    setNewPostContent("");
    // Refresh
    const { data } = await supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setForumPosts(data as unknown as ForumPost[]);
    toast({ title: "Message publié ✓" });
  };

  const filteredPosts = forumFilter === "all" ? forumPosts : forumPosts.filter(p => p.category === forumFilter);

  const ReservationList = ({ items }: { items: Reservation[] }) => (
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-6">Aucune réservation dans cette catégorie.</p>
    ) : (
      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[50px]">
                <p className="text-lg font-bold text-primary-dark">{new Date(r.date).getDate()}</p>
                <p className="text-xs text-muted-foreground uppercase">{new Date(r.date).toLocaleDateString("fr-FR", { month: "short" })}</p>
              </div>
              <div>
                <p className="font-medium">{r.activity_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {r.time}{r.end_time ? ` - ${r.end_time}` : ""}
                  {r.participants > 1 && <span>· {r.participants} pers.</span>}
                </div>
              </div>
            </div>
            <Badge variant="outline" className={statusColors[r.status] || ""}>{r.status}</Badge>
          </div>
        ))}
      </div>
    )
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
                <User className="h-6 w-6 text-primary-dark" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-dark">Mon Espace</h1>
                <p className="text-muted-foreground text-sm">Bonjour {CLIENT_NAME} 👋</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/calendrier">
                <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Réserver</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => navigate("/login")} className="gap-1.5 text-muted-foreground">
                <LogOut className="h-4 w-4" /> Déconnexion
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{totalCredits}</p>
              <p className="text-xs text-muted-foreground">Crédits restants</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{cards.length}</p>
              <p className="text-xs text-muted-foreground">Cartes actives</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{upcomingReservations.length}</p>
              <p className="text-xs text-muted-foreground">Prochaines résa</p>
            </div>
            <div className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary-dark">{reservations.length}</p>
              <p className="text-xs text-muted-foreground">Total réservations</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Tabs defaultValue="reservations">
              <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                <TabsTrigger value="reservations" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Réservations</TabsTrigger>
                <TabsTrigger value="cartes" className="gap-1.5"><CreditCard className="h-4 w-4" /> Mes Cartes</TabsTrigger>
                <TabsTrigger value="profil" className="gap-1.5"><User className="h-4 w-4" /> Mon Profil</TabsTrigger>
                <TabsTrigger value="communaute" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Communauté</TabsTrigger>
              </TabsList>

              {/* ─── RESERVATIONS TAB ─── */}
              <TabsContent value="reservations" className="mt-4">
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">Toutes ({reservations.length})</TabsTrigger>
                    <TabsTrigger value="yoga">Yoga ({yogaReservations.length})</TabsTrigger>
                    <TabsTrigger value="poterie">Poterie ({potteryReservations.length})</TabsTrigger>
                    <TabsTrigger value="ateliers">Ateliers ({atelierReservations.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all"><ReservationList items={reservations} /></TabsContent>
                  <TabsContent value="yoga"><ReservationList items={yogaReservations} /></TabsContent>
                  <TabsContent value="poterie"><ReservationList items={potteryReservations} /></TabsContent>
                  <TabsContent value="ateliers"><ReservationList items={atelierReservations} /></TabsContent>
                </Tabs>
              </TabsContent>

              {/* ─── CARTES TAB ─── */}
              <TabsContent value="cartes" className="mt-4 space-y-4">
                {cards.length === 0 ? (
                  <div className="text-center py-12"><p className="text-muted-foreground">Aucune carte active.</p></div>
                ) : (
                  cards.map((card) => {
                    const remaining = card.total_sessions - card.used_sessions;
                    const pct = (card.used_sessions / card.total_sessions) * 100;
                    return (
                      <div key={card.id} className="rounded-xl border bg-card p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-primary-dark">{card.card_name}</h3>
                          <span className="text-sm text-muted-foreground">
                            Expire le {new Date(card.expires_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary-dark transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-medium">{card.used_sessions}/{card.total_sessions}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {remaining} crédit{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })
                )}
              </TabsContent>

              {/* ─── PROFIL TAB ─── */}
              <TabsContent value="profil" className="mt-4">
                <div className="rounded-xl border bg-card p-6 max-w-lg space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary-dark" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-primary-dark">{CLIENT_NAME}</h3>
                      <p className="text-xs text-muted-foreground">Membre depuis {reservations.length > 0 ? new Date(reservations[reservations.length - 1]?.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "récemment"}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-sm">Ma bio</Label>
                      {!editingBio && (
                        <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => setEditingBio(true)}>
                          <Pencil className="h-3 w-3" /> Modifier
                        </Button>
                      )}
                    </div>
                    {editingBio ? (
                      <div className="space-y-2">
                        <Textarea value={bioValue} onChange={e => setBioValue(e.target.value)} rows={3} placeholder="Présentez-vous en quelques mots..." />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveProfile}>Enregistrer</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingBio(false)}>Annuler</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{bioValue || "Aucune bio pour le moment."}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">Apparaître dans la communauté</p>
                      <p className="text-xs text-muted-foreground">Les autres membres pourront voir votre profil</p>
                    </div>
                    <Switch checked={showInCommunity} onCheckedChange={(v) => { setShowInCommunity(v); }} />
                  </div>
                  {showInCommunity !== (profile?.show_in_community ?? false) && (
                    <Button size="sm" onClick={saveProfile}>Sauvegarder la visibilité</Button>
                  )}
                </div>
              </TabsContent>

              {/* ─── COMMUNAUTÉ TAB ─── */}
              <TabsContent value="communaute" className="mt-4 space-y-6">
                {/* Community members */}
                {communityMembers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Membres de la communauté</h3>
                    <div className="flex flex-wrap gap-3">
                      {communityMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5 bg-card">
                          <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center">
                            <User className="h-3 w-3 text-primary-dark" />
                          </div>
                          <span className="text-sm font-medium">{m.user_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New post */}
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <h3 className="text-sm font-medium text-primary-dark">Publier un message</h3>
                  <div className="flex gap-2">
                    <Select value={newPostCategory} onValueChange={setNewPostCategory}>
                      <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORUM_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)} rows={2} placeholder="Partagez avec la communauté..." />
                  <Button size="sm" className="gap-1.5" onClick={postToForum} disabled={!newPostContent.trim()}>
                    <Send className="h-3.5 w-3.5" /> Publier
                  </Button>
                </div>

                {/* Filter + Posts */}
                <div>
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" variant={forumFilter === "all" ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setForumFilter("all")}>Tous</Button>
                    {FORUM_CATEGORIES.map(c => (
                      <Button key={c.value} size="sm" variant={forumFilter === c.value ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setForumFilter(c.value)}>{c.label}</Button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {filteredPosts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Aucun message pour le moment. Soyez le premier !</p>
                    ) : (
                      filteredPosts.map(post => (
                        <div key={post.id} className="rounded-lg border bg-card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-primary-dark" />
                              </div>
                              <span className="text-sm font-medium">{post.author_name}</span>
                              <Badge variant="outline" className="text-xs">{FORUM_CATEGORIES.find(c => c.value === post.category)?.label || post.category}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-line">{post.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
