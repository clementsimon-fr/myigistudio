import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Users, Euro, CreditCard, Minus, Plus,
  ChevronRight, ChevronLeft, Sparkles, Gift, Ticket, Info, Check, Trash2, ArrowLeft, ShoppingBag, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { makeDisplayName, makeSyntheticEmail, makeTestIdentifier } from "@/lib/client-name";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import MockStripeModal from "@/components/demo/MockStripeModal";
import LoginBlock from "@/components/booking/LoginBlock";
import YogaFormulasBlock, { YogaFormulasPricingCard } from "@/components/YogaFormulasBlock";
import type { Course, Workshop, Schedule } from "@/hooks/useActivitiesData";

const DAY_INDEX: Record<string, number> = {
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

// A slot dated today is only bookable if its start time hasn't passed yet.
function isBookableSlot(dateStr: string, timeStr?: string): boolean {
  const now = new Date();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const slotDate = new Date(dateStr + "T00:00:00");
  if (slotDate.getTime() > today.getTime()) return true;
  if (slotDate.getTime() < today.getTime()) return false;
  if (!timeStr) return true;
  const [h, m] = timeStr.split(":").map(Number);
  const slotDateTime = new Date(today);
  slotDateTime.setHours(h || 0, m || 0, 0, 0);
  return slotDateTime > now;
}

// Format en date locale (année-mois-jour) — ne PAS utiliser toISOString() ici :
// il convertit en UTC et décale la date d'un jour dans les fuseaux horaires
// en avance sur UTC (ex. Europe/Paris), ce qui envoyait certaines réservations
// sur le mauvais jour de la semaine.
function formatLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DateOption {
  date: string; time: string; end_time: string; scheduleId: string;
  linkedWorkshopIds?: string[]; linkedDates?: string[];
}

function nextDatesForCourse(schedules: Schedule[], count = 8): DateOption[] {
  const out: DateOption[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && out.length < count; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dow = d.getDay();
    for (const s of schedules) {
      const idx = DAY_INDEX[(s.day || "").toLowerCase()];
      if (idx !== dow) continue;
      const dateStr = formatLocalDateStr(d);
      if (!isBookableSlot(dateStr, s.time)) continue;
      out.push({ date: dateStr, time: s.time, end_time: s.end_time, scheduleId: s.id });
    }
  }
  return out;
}

// A method describes how the booking is paid/used. Each cart item embeds capacity.
type CartItemMethod =
  | { kind: "unit"; price: number }
  | { kind: "formula"; cardId: string; cardName: string; sessions: number; price: number }
  | { kind: "voucher"; code: string; amount: number }
  | { kind: "existing_card"; cardName: string };

interface CartItem {
  id: string;
  method: CartItemMethod;
  capacity: number; // total sessions this item provides
}

interface Participant {
  name: string;
  isMe: boolean;
}

interface BookingSheetProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
  workshop?: Workshop | null;
  schedules?: Schedule[];
  workshopsList?: Workshop[];
  unitPrice?: number | null;
}

const newId = () => Math.random().toString(36).slice(2, 10);

// "Carte" est un terme réservé au yoga (cartes de cours) — pour la poterie on parle de tarif/paiement.
function methodLabel(m: CartItemMethod, isYoga: boolean): string {
  if (m.kind === "unit") return isYoga ? `Carte à l'unité — ${m.price} €` : `Tarif — ${m.price} €`;
  if (m.kind === "formula") return `Formule "${m.cardName}" (${m.sessions} cours) — ${m.price} €`;
  if (m.kind === "voucher") return `Bon cadeau ${m.code} (${m.amount} €)`;
  return `Carte du compte`;
}

function methodShort(m: CartItemMethod, isYoga: boolean): string {
  if (m.kind === "unit") return isYoga ? "Carte unité" : "Tarif";
  if (m.kind === "formula") return `Formule ${m.cardName}`;
  if (m.kind === "voucher") return `Bon ${m.code}`;
  return "Carte du compte";
}

export default function BookingSheet({
  open, onClose, course, workshop, schedules = [], workshopsList = [], unitPrice,
}: BookingSheetProps) {
  const { toast } = useToast();
  const { session, user, clientProfile } = useAuth();
  const isYoga = !!course;
  const connectedName = clientProfile ? (makeDisplayName(clientProfile.first_name, clientProfile.last_name) || clientProfile.email) : "";

  const dates = useMemo((): DateOption[] => {
    if (workshop) {
      const matching = workshopsList
        .filter((w) => w.name === workshop.name && isBookableSlot(w.date, w.time))
        .sort((a, b) => a.date.localeCompare(b.date));
      // Multi-sessions (dates liées) : n'afficher que la première date de la série comme
      // créneau réservable — les dates suivantes sont réservées automatiquement avec elle,
      // pas individuellement. On regroupe par linked_group pour retrouver toutes les dates liées.
      const byGroup: Record<string, typeof matching> = {};
      for (const w of matching) {
        if (w.linked_group) {
          if (!byGroup[w.linked_group]) byGroup[w.linked_group] = [];
          byGroup[w.linked_group].push(w);
        }
      }
      const seenGroups = new Set<string>();
      const result: DateOption[] = [];
      for (const w of matching) {
        if (w.linked_group) {
          if (seenGroups.has(w.linked_group)) continue;
          seenGroups.add(w.linked_group);
          const group = byGroup[w.linked_group];
          result.push({
            date: w.date, time: w.time, end_time: w.end_time, scheduleId: w.id,
            linkedWorkshopIds: group.map((g) => g.id),
            linkedDates: group.map((g) => g.date),
          });
        } else {
          result.push({ date: w.date, time: w.time, end_time: w.end_time, scheduleId: w.id });
        }
      }
      return result;
    }
    if (course) return nextDatesForCourse(schedules);
    return [];
  }, [course, workshop, schedules, workshopsList]);

  const [step, setStep] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  // Cart of tariff items chosen by user
  const [cart, setCart] = useState<CartItem[]>([]);
  // assignments[participantIdx] = cartItem.id
  const [assignments, setAssignments] = useState<Record<number, string | null>>({});
  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [pricingCards, setPricingCards] = useState<YogaFormulasPricingCard[]>([]);
  const [guestMode, setGuestMode] = useState(false);
  const [guestLastName, setGuestLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [noEmailMode, setNoEmailMode] = useState(false);
  const [guestPassword, setGuestPassword] = useState("");
  const [conditionsList, setConditionsList] = useState<{ id: string; title: string; content: string }[]>([]);
  const [existingCardsBalance, setExistingCardsBalance] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<null | "login">(null);
  const [showStripe, setShowStripe] = useState(false);

  // Init on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSelectedIdx(0);
    setConditionsAccepted(false);
    setCart([]);
    setAssignments({});
    setGuestMode(false);
    setGuestLastName("");
    setGuestEmail("");
    setNoEmailMode(false);
    setGuestPassword("");
    setParticipants([{ name: connectedName, isMe: !!session }]);
  }, [open]);

  // Sync participant 0 if profile changes mid-session
  useEffect(() => {
    if (!open) return;
    setParticipants((prev) => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return [{ name: connectedName || first.name, isMe: !!session }, ...rest];
    });
  }, [session, connectedName, open]);

  // Real remaining Yoga card balance for the connected client
  useEffect(() => {
    if (!open || !isYoga || !user) { setExistingCardsBalance(0); return; }
    supabase.from("client_cards").select("total_sessions, used_sessions").eq("user_id", user.id).then(({ data }) => {
      const balance = (data || []).reduce((sum, c: any) => sum + Math.max(0, c.total_sessions - c.used_sessions), 0);
      setExistingCardsBalance(balance);
    });
  }, [open, isYoga, user]);

  useEffect(() => {
    if (!open || !isYoga) return;
    supabase
      .from("pricing_cards")
      .select("id,name,sessions,price,validity,popular,payment_info,sort_order")
      .order("sort_order")
      .then(({ data }) => { if (data) setPricingCards(data as any); });
  }, [open, isYoga]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("conditions")
      .select("id,title,content,sort_order,active,applies_to")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return;
        const applies = isYoga ? "yoga" : "poterie";
        const filtered = (data as any[]).filter(
          (c) => !c.applies_to || c.applies_to.length === 0 || c.applies_to.includes(applies) || c.applies_to.includes("all")
        );
        setConditionsList(filtered as any);
      });
  }, [open, isYoga]);

  const selected = dates[selectedIdx];
  // Une fiche yoga en mode "prix" se paie comme la poterie (montant fixe, pas de cartes).
  const yogaPrixMode = isYoga && course?.tariff_mode === "prix";
  const pricePerUnit = yogaPrixMode ? (course?.price ?? 0) : isYoga ? unitPrice ?? 0 : (workshop?.price ?? 0);
  const useCardsSystem = isYoga && !yogaPrixMode;

  const setParticipantCount = (n: number) => {
    setParticipants((prev) => {
      const next = [...prev];
      while (next.length < n) next.push({ name: "", isMe: false });
      while (next.length > n) {
        const removedIdx = next.length - 1;
        next.pop();
        setAssignments((a) => { const c = { ...a }; delete c[removedIdx]; return c; });
      }
      return next;
    });
  };

  const updateParticipantName = (i: number, name: string) => {
    setParticipants((prev) => prev.map((p, idx) => idx === i ? { ...p, name } : p));
  };

  // ---- Cart helpers ----
  const cartCapacity = useMemo(() => cart.reduce((s, c) => s + c.capacity, 0), [cart]);

  const slotsUsed = (itemId: string) =>
    Object.values(assignments).filter((id) => id === itemId).length;

  const addCartItem = (method: CartItemMethod, capacity: number) => {
    setCart((c) => [...c, { id: newId(), method, capacity }]);
  };

  const removeCartItem = (id: string) => {
    setCart((c) => c.filter((x) => x.id !== id));
    setAssignments((a) => {
      const next: Record<number, string | null> = {};
      Object.entries(a).forEach(([k, v]) => {
        next[Number(k)] = v === id ? null : v;
      });
      return next;
    });
  };

  // Total to pay: sum prices (formula price counted once per item; existing_card = 0;
  // voucher covers up to its amount, the client pays the difference if the tarif costs more).
  const totalToPay = useMemo(() => {
    let t = 0;
    cart.forEach((ci) => {
      if (ci.method.kind === "unit") t += ci.method.price;
      else if (ci.method.kind === "formula") t += ci.method.price;
      else if (ci.method.kind === "voucher") t += Math.max(0, pricePerUnit - ci.method.amount);
    });
    return t;
  }, [cart, pricePerUnit]);

  const allAssigned = participants.length > 0 && participants.every((_, i) => !!assignments[i]);

  // Cas trivial : 1 participant + 1 tarif acheté → rien à choisir, l'étape Attribution est sautée.
  const shouldSkipAssignStep = participants.length === 1 && cart.length === 1;

  // Attribution automatique par défaut (dans l'ordre, en respectant la capacité de chaque tarif) —
  // recalculée à chaque changement de composition ; l'utilisateur peut ensuite ajuster manuellement.
  useEffect(() => {
    const next: Record<number, string | null> = {};
    const used: Record<string, number> = {};
    for (let i = 0; i < participants.length; i++) {
      const item = cart.find((ci) => (used[ci.id] || 0) < ci.capacity);
      if (item) {
        next[i] = item.id;
        used[item.id] = (used[item.id] || 0) + 1;
      } else {
        next[i] = null;
      }
    }
    setAssignments(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, participants.length]);

  // ---- Step gating ----
  // Une cliente déjà connectée n'a pas besoin de l'étape "Qui réserve ?" — elle est sautée (voir goNext/goPrev).
  const identityChosen = !!session || (guestMode && (
    noEmailMode
      ? guestLastName.trim().length > 0 && guestPassword.trim().length >= 6
      : guestEmail.trim().length > 0
  ));
  const canNext = () => {
    if (step === 1) return !!selected;
    if (step === 2) return identityChosen && (participants[0]?.name.trim().length > 0);
    if (step === 3) return participants.length > 0 && participants.every((p) => p.name.trim().length > 0) && cart.length > 0 && cartCapacity >= participants.length;
    if (step === 4) return allAssigned;
    return true;
  };

  const STEPS = [
    { n: 1, label: "Date", icon: CalendarDays },
    { n: 2, label: "Qui réserve ?", icon: Users },
    { n: 3, label: "Participants & achats", icon: Users },
    { n: 4, label: "Attribution", icon: Euro },
    { n: 5, label: "Paiement", icon: CreditCard },
  ];

  const goNext = () => setStep((s) => {
    if (s === 1 && session) return 3;
    if (s === 3 && shouldSkipAssignStep) return 5;
    return s + 1;
  });
  const goPrev = () => setStep((s) => {
    if (s === 3 && session) return 1;
    if (s === 5 && shouldSkipAssignStep) return 3;
    return s - 1;
  });

  // Bouton retour du téléphone / geste swipe-back : revient à l'étape précédente
  // au lieu de quitter la page. À la toute première étape, ferme le tunnel.
  useBackNavigation(open, step, () => {
    if (step === 1) onClose();
    else goPrev();
  });

  // ---- Finalize ----
  const finalize = async () => {
    if (!selected) return;
    // Garde-fou : une date passée ne doit jamais pouvoir être réservée, même si la liste des
    // créneaux affichée était périmée (onglet resté ouvert, cache) — todayLocalStr() en date
    // locale, pas toISOString(), pour éviter le décalage UTC déjà rencontré ailleurs.
    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    if (selected.date < todayStr) {
      toast({ title: "Cette date n'est plus disponible", description: "Merci de choisir une date à venir.", variant: "destructive" });
      setStep(1);
      return;
    }

    // Vérification des places au moment du paiement — le nombre affiché à l'étape 1 peut être
    // périmé si quelqu'un d'autre a réservé entre-temps ; on relit spots_left en base juste
    // avant de confirmer pour ne jamais dépasser la capacité réelle.
    const requiredSpots = participants.length;
    let courseSchedSpotsLeft = 0;
    let workshopSpotsLeftById: Record<string, number> = {};
    if (course && selected.scheduleId) {
      const { data: schedRow } = await supabase.from("course_schedules").select("spots_left").eq("id", selected.scheduleId).maybeSingle();
      if (!schedRow || schedRow.spots_left < requiredSpots) {
        toast({ title: "Plus assez de places disponibles", description: "Quelqu'un d'autre vient de réserver entre-temps. Merci de choisir un autre créneau.", variant: "destructive" });
        setStep(1);
        return;
      }
      courseSchedSpotsLeft = schedRow.spots_left;
    } else if (workshop) {
      const wsIds = selected.linkedWorkshopIds && selected.linkedWorkshopIds.length > 1 ? selected.linkedWorkshopIds : [selected.scheduleId];
      const { data: wsRows } = await supabase.from("workshops").select("id, spots_left").in("id", wsIds);
      const insufficient = !wsRows || wsRows.length !== wsIds.length || wsRows.some((w: any) => w.spots_left < requiredSpots);
      if (insufficient) {
        toast({ title: "Plus assez de places disponibles", description: "Quelqu'un d'autre vient de réserver entre-temps. Merci de choisir un autre créneau.", variant: "destructive" });
        setStep(1);
        return;
      }
      for (const w of wsRows as { id: string; spots_left: number }[]) workshopSpotsLeftById[w.id] = w.spots_left;
    }

    const name = course?.name || workshop?.name || "";

    // Invitée sans session : le compte se crée silencieusement au moment du paiement,
    // sans bloquer la réservation en cours sur un lien email à cliquer.
    let userId = user?.id || null;
    const clientName = session ? connectedName : makeDisplayName(participants[0]?.name || "", guestLastName) || participants[0]?.name || "Invité";
    const accountEmail = noEmailMode ? makeSyntheticEmail(participants[0]?.name || "", guestLastName) : guestEmail.trim();
    if (!userId && accountEmail) {
      try {
        const { data, error } = await supabase.functions.invoke("create-guest-account", {
          body: {
            email: accountEmail, first_name: participants[0]?.name || "", last_name: guestLastName, phone: "",
            ...(noEmailMode ? { password: guestPassword } : {}),
          },
        });
        if (!error && data?.user_id) {
          userId = data.user_id;
          // Le compte vient d'être créé : on connecte la cliente tout de suite pour qu'elle
          // reste identifiée si elle enchaîne d'autres réservations dans la foulée.
          if (data.password) {
            await supabase.auth.signInWithPassword({ email: accountEmail, password: data.password });
          }
        }
      } catch {
        // Edge function indisponible : la réservation continue quand même, sans compte lié.
      }
    }

    // Cartes existantes utilisées : décrémenter la carte dont la validité expire le plus tôt
    // en premier, pour ne pas laisser une cliente perdre des séances sur une carte qui va
    // périmer alors qu'une autre carte plus récente aurait encore le temps d'être utilisée.
    const existingCardUses = cart.filter((ci) => ci.method.kind === "existing_card").length;
    if (existingCardUses > 0 && userId) {
      const { data: myCards } = await supabase
        .from("client_cards")
        .select("id, total_sessions, used_sessions, expires_at")
        .eq("user_id", userId)
        .order("expires_at", { ascending: true });
      let remainingToConsume = existingCardUses;
      for (const c of (myCards as any[]) || []) {
        if (remainingToConsume <= 0) break;
        const available = c.total_sessions - c.used_sessions;
        if (available <= 0) continue;
        const consume = Math.min(available, remainingToConsume);
        await supabase.from("client_cards").update({ used_sessions: c.used_sessions + consume }).eq("id", c.id);
        remainingToConsume -= consume;
      }
    }

    // Formules achetées : créditer une nouvelle carte, déjà partiellement utilisée par les participants assignés.
    for (const ci of cart) {
      if (ci.method.kind !== "formula") continue;
      const method = ci.method;
      const used = slotsUsed(ci.id);
      const match = pricingCards.find((p) => p.id === method.cardId);
      const months = match ? parseInt(match.validity.match(/(\d+)/)?.[1] || "1", 10) : 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);
      await supabase.from("client_cards").insert({
        client_name: clientName,
        user_id: userId,
        card_name: method.cardName,
        total_sessions: ci.capacity,
        used_sessions: used,
        expires_at: formatLocalDateStr(expiresAt),
      } as any);
    }

    // Bons cadeaux utilisés : on les marque consommés pour empêcher une réutilisation.
    for (const ci of cart) {
      if (ci.method.kind !== "voucher") continue;
      await supabase.from("gift_vouchers").update({ used: true, used_at: new Date().toISOString() } as any).eq("code", ci.method.code);
    }

    // Un même identifiant relie toutes les lignes d'un même paiement (une ou plusieurs dates
    // liées, un ou plusieurs participants) — permet de retrouver la liste complète des
    // participants d'une réservation depuis l'espace client.
    const bookingGroupId = crypto.randomUUID();
    // Chaque tarif acheté n'est facturé qu'une seule fois au total (au premier participant qui
    // l'utilise), même s'il couvre plusieurs personnes ou plusieurs dates d'une même série.
    const chargedItemIds = new Set<string>();

    // Une ligne de réservation par participant (et par date liée en cas de multi-sessions) :
    // le participant 0 est le compte réservant, les suivants sont des invités sans compte
    // (user_id null) — permet à l'admin de voir chaque personne nommément (pas juste "×2").
    const participantRows = (date: string, workshopId: string | null) =>
      participants.map((p, i) => {
        const item = cart.find((ci) => ci.id === assignments[i]);
        let paymentMethod: string | null = null;
        let paymentAmount = 0;
        if (item) {
          paymentMethod = methodLabel(item.method, useCardsSystem);
          if ((item.method.kind === "unit" || item.method.kind === "formula") && !chargedItemIds.has(item.id)) {
            paymentAmount = item.method.price;
            chargedItemIds.add(item.id);
          } else if (item.method.kind === "voucher" && !chargedItemIds.has(item.id)) {
            paymentAmount = Math.max(0, pricePerUnit - item.method.amount);
            chargedItemIds.add(item.id);
          }
        }
        return {
          client_name: i === 0 ? clientName : (p.name.trim() || "Invité"),
          user_id: i === 0 ? userId : null,
          activity_name: name,
          activity_type: course ? "course" : "workshop",
          date,
          time: selected.time,
          end_time: selected.end_time,
          participants: 1,
          status: "confirmé",
          course_id: course?.id || null,
          workshop_id: workshopId,
          booking_group_id: bookingGroupId,
          payment_method: paymentMethod,
          payment_amount: paymentAmount,
        };
      });

    if (course) {
      await supabase.from("reservations").insert(participantRows(selected.date, null) as any);
      if (selected.scheduleId) {
        await supabase.from("course_schedules").update({ spots_left: Math.max(0, courseSchedSpotsLeft - requiredSpots) }).eq("id", selected.scheduleId);
      }
    } else if (selected.linkedWorkshopIds && selected.linkedWorkshopIds.length > 1) {
      // Multi-sessions : une réservation par date liée, pour que chaque date apparaisse
      // correctement dans l'agenda admin.
      const rows = selected.linkedWorkshopIds.flatMap((wsId, i) => participantRows(selected.linkedDates![i], wsId));
      await supabase.from("reservations").insert(rows as any);
      for (const wsId of selected.linkedWorkshopIds) {
        const left = workshopSpotsLeftById[wsId];
        if (left != null) await supabase.from("workshops").update({ spots_left: Math.max(0, left - requiredSpots) }).eq("id", wsId);
      }
    } else {
      await supabase.from("reservations").insert(participantRows(selected.date, selected.scheduleId) as any);
      if (selected.scheduleId) {
        const left = workshopSpotsLeftById[selected.scheduleId];
        if (left != null) await supabase.from("workshops").update({ spots_left: Math.max(0, left - requiredSpots) }).eq("id", selected.scheduleId);
      }
    }

    toast({ title: "Réservation confirmée ✓", description: `${name} — ${new Date(selected.date).toLocaleDateString("fr-FR")} à ${selected.time}` });
    onClose();
  };

  const handleConfirmPayment = () => {
    if (totalToPay > 0) setShowStripe(true);
    else finalize();
  };

  const activityName = course?.name || workshop?.name || "";

  const rootRef = useRef<HTMLDivElement>(null);
  const isFirstStepRender = useRef(true);

  // Scroll into view only when step changes (not on first open)
  useEffect(() => {
    if (!open) { isFirstStepRender.current = true; return; }
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    if (rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [step, open]);

  // Browser back sync
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ bookingStep: step }, "");
    const handler = (e: PopStateEvent) => {
      const target = (e.state && (e.state as any).bookingStep) as number | undefined;
      if (typeof target === "number" && target >= 1 && target <= 5) {
        setStep(target);
      } else {
        setStep((s) => {
          const next = Math.max(1, s - 1);
          window.history.pushState({ bookingStep: next }, "");
          return next;
        });
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const prevStepRef = useRef(step);
  useEffect(() => {
    if (!open) return;
    if (prevStepRef.current !== step) {
      window.history.pushState({ bookingStep: step }, "");
      prevStepRef.current = step;
    }
  }, [step, open]);

  if (!open) return null;

  // ---- Smart summary lines (Step 5 + Step 6) ----
  const summaryLines = cart.map((ci) => {
    const used = slotsUsed(ci.id);
    const remaining = Math.max(0, ci.capacity - used);
    const usedBy = participants
      .map((p, i) => assignments[i] === ci.id ? (p.isMe ? `Moi (${p.name})` : (p.name || `Participant ${i + 1}`)) : null)
      .filter(Boolean) as string[];
    let line = "";
    if (ci.method.kind === "formula") {
      line = `Formule "${ci.method.cardName}" (${ci.capacity} cours) — ${ci.method.price} €. ${used} cours utilisé${used > 1 ? "s" : ""}${usedBy.length ? " : " + usedBy.join(", ") : ""}.`;
      if (remaining > 0) line += ` ${remaining} cours crédité${remaining > 1 ? "s" : ""} sur votre compte.`;
    } else if (ci.method.kind === "unit") {
      line = `${useCardsSystem ? "Carte à l'unité" : "Tarif"} — ${ci.method.price} €${usedBy.length ? ` (${usedBy.join(", ")})` : ""}.`;
    } else if (ci.method.kind === "voucher") {
      const diff = Math.max(0, pricePerUnit - ci.method.amount);
      line = `Bon cadeau ${ci.method.code} (${ci.method.amount} €)${diff > 0 ? ` + ${diff} € à régler` : ""}${usedBy.length ? ` — utilisé par ${usedBy.join(", ")}` : ""}.`;
    } else {
      line = `1 cours (carte du compte)${usedBy.length ? ` — utilisé par ${usedBy.join(", ")}` : ""}.`;
    }
    return { id: ci.id, line, remaining: ci.method.kind === "formula" ? remaining : 0 };
  });

  return (
    <>
      <div
        ref={rootRef}
        className="mb-4 rounded-2xl border bg-card shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-semibold text-primary-dark">
              Réservation
            </h2>
            {selected && (
              <p className="text-[11px] text-muted-foreground capitalize">
                {new Date(selected.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {selected.time?.slice(0, 5)}
              </p>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="px-5 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1">
                <button
                  onClick={() => { if (s.n < step) setStep(s.n); }}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold transition-all ${
                    step === s.n
                      ? "bg-primary text-primary-foreground"
                      : s.n < step
                        ? "bg-primary/10 text-primary-dark"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <s.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.n}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${s.n < step ? "bg-primary/30" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {/* STEP 1 — Date */}
              {step === 1 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">Choisissez votre date</h3>
                  {dates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune date disponible.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {dates.map((d, i) => {
                        const dt = new Date(d.date + "T12:00:00");
                        const isMulti = (d.linkedWorkshopIds?.length || 0) > 1;
                        return (
                          <button
                            key={`${d.scheduleId}-${d.date}`}
                            onClick={() => setSelectedIdx(i)}
                            className={`text-left rounded-xl border p-3 text-sm transition-all ${
                              i === selectedIdx ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                            }`}
                          >
                            <div className="font-medium capitalize text-xs">
                              {dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}
                            </div>
                            <div className="text-[11px] opacity-80 mt-0.5">{d.time?.slice(0, 5)}</div>
                            {isMulti && (
                              <div className={`text-[10px] mt-1 font-medium ${i === selectedIdx ? "text-primary-foreground/90" : "text-primary"}`}>
                                Multi-sessions · {d.linkedWorkshopIds!.length} dates
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selected && (selected.linkedDates?.length || 0) > 1 && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary-dark">
                      Cette réservation couvre <strong>{selected.linkedDates!.length} dates liées</strong> : {selected.linkedDates!.map(d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })).join(" & ")}.
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 — Qui réserve ? */}
              {step === 2 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold">Qui réserve ?</h3>
                  {(() => {
                    const p = participants[0];
                    if (!p) return null;
                    return (
                      <div className="rounded-lg border bg-card p-3">
                        <Label className="text-[11px] text-muted-foreground">Réservant</Label>
                        {p.isMe ? (
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-medium">Moi — {p.name}</span>
                            <Badge variant="secondary" className="text-[10px]">Connecté</Badge>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Prénom"
                                value={p.name}
                                onChange={(e) => { updateParticipantName(0, e.target.value); setGuestMode(true); }}
                              />
                              <Input
                                placeholder="Nom"
                                value={guestLastName}
                                onChange={(e) => { setGuestLastName(e.target.value); setGuestMode(true); }}
                              />
                            </div>
                            <Input
                              type="email"
                              placeholder="Email"
                              value={guestEmail}
                              disabled={noEmailMode}
                              onChange={(e) => { setGuestEmail(e.target.value); setGuestMode(true); }}
                              className={noEmailMode ? "opacity-50" : ""}
                            />
                            {!noEmailMode && (
                              <p className="text-[11px] text-muted-foreground">
                                Votre compte sera créé automatiquement au moment du paiement.
                              </p>
                            )}

                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Checkbox checked={noEmailMode} onCheckedChange={(v) => { setNoEmailMode(!!v); setGuestMode(true); }} />
                              Pas d'email (mode test)
                            </label>
                            {noEmailMode && (
                              <>
                                <p className="text-[11px] text-muted-foreground">
                                  Identifiant de connexion : <strong className="text-foreground">{makeTestIdentifier(p.name, guestLastName) || "PRENOMNOM"}</strong>
                                </p>
                                <Input
                                  type="password"
                                  placeholder="Choisir un mot de passe (6 caractères min.)"
                                  value={guestPassword}
                                  onChange={(e) => setGuestPassword(e.target.value)}
                                />
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => setAuthMode("login")}
                              className="text-xs text-primary-dark underline hover:no-underline"
                            >
                              Déjà un compte ? Se connecter
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* STEP 3 — Participants + Achats (fusionnées, deux colonnes) */}
              {step === 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  {/* Colonne 1 — Participants */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Participants</h3>
                      <div className="inline-flex items-center gap-2 rounded-lg border bg-background p-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setParticipantCount(Math.max(1, participants.length - 1))}
                          disabled={participants.length <= 1}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-sm font-semibold min-w-[20px] text-center">{participants.length}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setParticipantCount(participants.length + 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {participants.map((p, i) => (
                        <div key={i} className="rounded-lg border bg-card p-3">
                          <Label className="text-[11px] text-muted-foreground">Participant {i + 1}</Label>
                          {i === 0 ? (
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {p.isMe ? `Moi — ${p.name}` : p.name || "—"}
                              </span>
                              {p.isMe && <Badge variant="secondary" className="text-[10px]">Connecté</Badge>}
                              {!p.isMe && guestMode && <Badge variant="secondary" className="text-[10px]">Invité</Badge>}
                            </div>
                          ) : (
                            <Input
                              className="mt-1"
                              placeholder="Prénom"
                              value={p.name}
                              onChange={(e) => updateParticipantName(i, e.target.value)}
                            />
                          )}
                        </div>
                      ))}
                      {participants.length === 1 && (
                        <p className="text-[11px] text-muted-foreground">
                          Vous pouvez continuer seul·e ou cliquer sur + pour ajouter des participants.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Colonne 2 — Moyen de paiement */}
                  <div className="space-y-3 sm:border-l sm:pl-5">
                    <h3 className="text-sm font-semibold">Vos achats</h3>

                    <p className="text-[11px] text-muted-foreground">
                      Ajoutez les tarifs, formules ou bons cadeaux que vous souhaitez utiliser. L'attribution aux participants se fera à l'étape suivante.
                    </p>

                    {cart.length > 0 && (
                      <div className="space-y-2">
                        {cart.map((ci) => (
                          <div key={ci.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{methodLabel(ci.method, useCardsSystem)}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {ci.capacity} place{ci.capacity > 1 ? "s" : ""}
                              </p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCartItem(ci.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={() => setPickerOpen(true)}
                      className="w-full gap-2"
                      variant={cartCapacity >= participants.length ? "outline" : "default"}
                    >
                      <Sparkles className="h-4 w-4" />
                      {cart.length === 0 ? "Ajouter un tarif" : "Ajouter un autre tarif"}
                    </Button>

                    {cartCapacity < participants.length && (
                      <p className="text-xs text-destructive">
                        Il manque {participants.length - cartCapacity} place{participants.length - cartCapacity > 1 ? "s" : ""} pour couvrir les {participants.length} participants — ajoutez un tarif supplémentaire.
                      </p>
                    )}

                    {totalToPay > 0 && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
                        Total à régler : <strong>{totalToPay} €</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4 — Attribution & récap intelligent */}
              {step === 4 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">Vérifiez qui utilise quoi</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Nous avons associé chaque participant automatiquement. Modifiez si besoin.
                  </p>

                  <div className="space-y-2">
                    {participants.map((p, i) => {
                      const currentId = assignments[i] || "";
                      return (
                        <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
                          <Label className="text-[11px] text-muted-foreground">
                            {p.isMe ? `Moi — ${p.name}` : p.name || `Participant ${i + 1}`}
                          </Label>
                          <Select
                            value={currentId}
                            onValueChange={(v) => setAssignments((a) => ({ ...a, [i]: v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Choisir un tarif" /></SelectTrigger>
                            <SelectContent>
                              {cart.map((ci) => {
                                const used = slotsUsed(ci.id);
                                const available = ci.capacity - used + (currentId === ci.id ? 1 : 0);
                                const disabled = available <= 0;
                                return (
                                  <SelectItem key={ci.id} value={ci.id} disabled={disabled}>
                                    {methodShort(ci.method, useCardsSystem)} — {available}/{ci.capacity} dispo.
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                      Ce que vous allez payer
                    </p>
                    {summaryLines.map((s) => (
                      <p key={s.id} className="text-xs leading-relaxed">{s.line}</p>
                    ))}
                    <div className="border-t pt-1.5 mt-1.5 flex justify-between text-sm">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold">{totalToPay} €</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5 — Conditions + Paiement */}
              {step === 5 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">Récapitulatif & paiement</h3>

                  <div className="rounded-xl border bg-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{activityName}</p>
                        {selected && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {new Date(selected.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {selected.time?.slice(0, 5)}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">{participants.length} pers.</Badge>
                    </div>
                    {selected && (selected.linkedDates?.length || 0) > 1 && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 text-xs text-primary-dark">
                        Multi-sessions : cette réservation couvre <strong>{selected.linkedDates!.length} dates</strong> — {selected.linkedDates!.map(d => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })).join(" & ")}.
                      </div>
                    )}
                    <div className="space-y-1.5 text-xs border-t pt-2">
                      {summaryLines.map((s) => (
                        <p key={s.id} className="leading-relaxed">{s.line}</p>
                      ))}
                    </div>
                    <div className="border-t pt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">Total à régler</span>
                      <span className="text-lg font-bold">{totalToPay} €</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/30 max-h-56 overflow-y-auto divide-y">
                    {conditionsList.length === 0 ? (
                      <p className="p-3 text-xs text-muted-foreground">
                        En réservant, vous acceptez les conditions de réservation et d'annulation de MyIgiStudio.
                      </p>
                    ) : (
                      conditionsList.map((c) => (
                        <details key={c.id} className="group">
                          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-primary-dark flex items-center justify-between hover:bg-muted/50">
                            <span>{c.title}</span>
                            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                          </summary>
                          <p className="px-3 pb-3 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                            {c.content}
                          </p>
                        </details>
                      ))
                    )}
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={conditionsAccepted}
                      onCheckedChange={(c) => setConditionsAccepted(!!c)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">J'ai lu et j'accepte l'ensemble des conditions</span>
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-5 py-3 flex items-center justify-between gap-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={goPrev}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          ) : <span />}
          {step < 5 ? (
            <Button onClick={goNext} disabled={!canNext()}>
              Continuer <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleConfirmPayment} disabled={!conditionsAccepted} className="gap-1.5 min-w-0 flex-1 sm:flex-initial">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="truncate min-w-0">{totalToPay > 0 ? `Confirmer le paiement (${totalToPay} €)` : "Confirmer la réservation"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Picker modal — adds items to cart */}
      <CartPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        isYoga={useCardsSystem}
        unitPrice={pricePerUnit}
        pricingCards={pricingCards}
        existingCards={existingCardsBalance}
        isConnected={identityChosen}
        cart={cart}
        onAdd={(method, capacity) => {
          addCartItem(method, capacity);
          setPickerOpen(false);
        }}
        onRequireAuth={() => { setPickerOpen(false); setAuthMode("login"); }}
      />

      {/* Auth dialog (inline) — pour une cliente qui a déjà un compte et veut s'y connecter */}
      <Dialog open={!!authMode} onOpenChange={(v) => !v && setAuthMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Se connecter</DialogTitle>
          </DialogHeader>
          <LoginBlock onBack={() => setAuthMode(null)} />
        </DialogContent>
      </Dialog>

      <MockStripeModal
        open={showStripe}
        onClose={() => setShowStripe(false)}
        onSuccess={() => { setShowStripe(false); finalize(); }}
        amount={totalToPay}
        description={`${activityName} — MyIgiStudio`}
      />
    </>
  );
}

/* ============================================================
 * CartPickerModal — adds tariff items to the cart
 * ============================================================ */
interface PickerProps {
  open: boolean;
  onClose: () => void;
  isYoga: boolean;
  unitPrice: number;
  pricingCards: YogaFormulasPricingCard[];
  existingCards: number;
  isConnected: boolean;
  cart: CartItem[];
  onAdd: (method: CartItemMethod, capacity: number) => void;
  onRequireAuth: (formula: YogaFormulasPricingCard) => void;
}

function CartPickerModal({
  open, onClose, isYoga, unitPrice, pricingCards, existingCards, isConnected, cart, onAdd, onRequireAuth,
}: PickerProps) {
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherChecking, setVoucherChecking] = useState(false);

  useEffect(() => {
    if (open) { setVoucherCode(""); setVoucherOpen(false); setVoucherError(""); }
  }, [open]);

  // Count existing cards already added to cart
  const accountCardsUsed = cart.filter((c) => c.method.kind === "existing_card").length;
  const accountCardsLeft = Math.max(0, existingCards - accountCardsUsed);

  const handleUnit = () => onAdd({ kind: "unit", price: unitPrice }, 1);
  const handleVoucher = async () => {
    const code = voucherCode.trim();
    if (!code) return;
    if (cart.some((ci) => ci.method.kind === "voucher" && ci.method.code.toLowerCase() === code.toLowerCase())) {
      setVoucherError("Ce bon cadeau est déjà dans votre panier.");
      return;
    }
    setVoucherChecking(true);
    setVoucherError("");
    const { data } = await supabase.from("gift_vouchers").select("code, amount, used, expires_at").ilike("code", code).maybeSingle();
    setVoucherChecking(false);
    if (!data) { setVoucherError("Ce code de bon cadeau n'existe pas."); return; }
    if (data.used) { setVoucherError("Ce bon cadeau a déjà été utilisé."); return; }
    if (data.expires_at && data.expires_at < new Date().toISOString().slice(0, 10)) {
      setVoucherError("Ce bon cadeau a expiré.");
      return;
    }
    onAdd({ kind: "voucher", code: data.code, amount: data.amount }, 1);
    setVoucherCode("");
    setVoucherOpen(false);
  };
  const handleExistingCard = () => {
    if (accountCardsLeft <= 0) return;
    onAdd({ kind: "existing_card", cardName: "Carte du compte" }, 1);
  };
  const handleFormula = (card: YogaFormulasPricingCard) => {
    if (card.sessions === 1) { handleUnit(); return; }
    if (!isConnected) { onRequireAuth(card); return; }
    onAdd(
      { kind: "formula", cardId: card.id, cardName: card.name, sessions: card.sessions, price: card.price },
      card.sessions
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary-dark">
            <Sparkles className="h-5 w-5" />
            Choisir un tarif à ajouter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Carte du compte — mise en avant en premier si disponible */}
          {isYoga && isConnected && accountCardsLeft > 0 && (
            <button
              onClick={handleExistingCard}
              className="w-full text-left rounded-xl border-2 p-4 bg-primary/10 border-primary shadow-sm hover:shadow-md hover:bg-primary/15 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-primary-dark flex items-center gap-1.5 text-base">
                    <Ticket className="h-5 w-5" /> Utiliser une de mes cartes
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {accountCardsLeft} cours disponible{accountCardsLeft > 1 ? "s" : ""}
                  </p>
                </div>
                <Badge className="bg-primary text-primary-foreground">Gratuit</Badge>
              </div>
            </button>
          )}

          {/* Bon cadeau */}
          <div className="rounded-lg border bg-amber-50/60 border-amber-200 p-3 space-y-2">
            {!voucherOpen ? (
              <button
                type="button"
                onClick={() => setVoucherOpen(true)}
                className="w-full flex items-center gap-2 font-semibold text-sm text-left"
              >
                <Gift className="h-4 w-4 text-amber-700" /> Utiliser un bon cadeau
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Gift className="h-4 w-4 text-amber-700" /> Utiliser un bon cadeau
                </div>
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Code du bon cadeau"
                    value={voucherCode}
                    onChange={(e) => { setVoucherCode(e.target.value); setVoucherError(""); }}
                    className="bg-background"
                  />
                  <Button onClick={handleVoucher} disabled={!voucherCode.trim() || voucherChecking}>
                    {voucherChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
                  </Button>
                </div>
                {voucherError && <p className="text-xs text-destructive">{voucherError}</p>}
              </>
            )}
          </div>

          {/* Carte à l'unité */}
          {isYoga && (
            <button
              onClick={handleUnit}
              className="w-full text-left rounded-lg border p-4 bg-emerald-50/60 border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-foreground">Carte Yoga à l'unité</p>
                  <p className="text-xs text-muted-foreground">1 cours</p>
                </div>
                <p className="text-lg font-bold">{unitPrice} €</p>
              </div>
            </button>
          )}

          {/* Formules */}
          {isYoga && pricingCards.filter((c) => c.sessions > 1).length > 0 && (
            <div className="space-y-2">
              <YogaFormulasBlock
                pricingCards={pricingCards.filter((c) => c.sessions > 1)}
                onSelectCard={handleFormula}
                showHeader={false}
              />
              {!isConnected && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Vous devez créer un compte ou vous connecter pour utiliser une formule.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Poterie, ou yoga en mode "prix" : paiement direct, pas de système de cartes */}
          {!isYoga && (
            <button
              onClick={() => onAdd({ kind: "unit", price: unitPrice }, 1)}
              className="w-full text-left rounded-lg border p-4 bg-amber-50/60 border-amber-200 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">Paiement direct</p>
                  <p className="text-xs text-muted-foreground">1 place</p>
                </div>
                <p className="text-lg font-bold">{unitPrice} €</p>
              </div>
            </button>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour au panier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
