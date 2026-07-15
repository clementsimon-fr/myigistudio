// ── Template Variables ──
export const TEMPLATE_VARIABLES = [
  { key: "{nom}", label: "Nom" },
  { key: "{activité}", label: "Activité" },
  { key: "{date}", label: "Date" },
  { key: "{heure}", label: "Heure" },
  { key: "{intervenant}", label: "Intervenant" },
  { key: "{adresse}", label: "Adresse" },
];

export const REMINDER_VARIABLES = TEMPLATE_VARIABLES.filter(v => ["{nom}", "{activité}", "{date}", "{heure}", "{intervenant}"].includes(v.key));
export const MODALITIES_VARIABLES = TEMPLATE_VARIABLES.filter(v => ["{activité}", "{date}", "{heure}", "{adresse}", "{intervenant}"].includes(v.key));

export const INITIAL_DEFAULT_REMINDER = "Bonjour {nom}, nous avons hâte de vous retrouver pour {activité} le {date} à {heure}. À bientôt !";
export const INITIAL_DEFAULT_MODALITIES = "📍 Adresse : {adresse}\n\n🧘 Merci d'arriver 5 minutes avant le début de la séance.\n🚗 Parking disponible à proximité.\n💧 Pensez à apporter votre bouteille d'eau.";

export const REMINDER_TIMINGS = [
  { value: "7j", label: "1 semaine" },
  { value: "3j", label: "3 jours" },
  { value: "1j", label: "1 jour" },
  { value: "12h", label: "12 heures" },
  { value: "3h", label: "3 heures" },
  { value: "1h", label: "1 heure" },
];

export const YOGA_INTENSITY = [
  { value: "none", label: "Non défini" },
  { value: "doux", label: "🌿 Doux" },
  { value: "equilibre", label: "⚖️ Équilibré" },
  { value: "dynamique", label: "🔥 Dynamique" },
];

export const ATELIER_INTENSITY = [
  { value: "none", label: "Non défini" },
  { value: "novice", label: "🌱 Novice" },
  { value: "amateur", label: "🎨 Amateur" },
  { value: "experimente", label: "⭐ Expérimenté" },
];

export function getIntensityOptions(category: string) {
  if (category === "yoga") return YOGA_INTENSITY;
  return ATELIER_INTENSITY;
}

export function getIntensityLabel(value: string | undefined) {
  if (!value || value === "none") return undefined;
  const all = [...YOGA_INTENSITY, ...ATELIER_INTENSITY];
  return all.find(i => i.value === value)?.label;
}

// ── Types ──
export interface Schedule {
  id?: string; day: string; time: string; end_time: string; spots: number; spots_left: number;
  price?: number; inclusions?: string; card_yoga_count?: number;
}

export interface WorkshopEvent {
  id: string; date: string; time: string; end_time: string; duration: string;
  price: number; spots: number; spots_left: number;
  inclusions: string; card_yoga_count: number;
  linked_group?: string | null;
}

export interface UnifiedActivity {
  id: string; name: string; description: string; long_description: string; category: string;
  image: string; instructor: string; instructor_id: string | null;
  images: string[];
  reminder_template: string; modalities: string; source: "course" | "workshop";
  courseIds?: string[];
  frequency?: string; spots?: number; spots_left?: number; schedules?: Schedule[];
  date?: string; time?: string; end_time?: string; duration?: string; price?: number;
  intensity?: string; reminder_timing?: string;
  inclusions?: string; card_yoga_count?: number; complementary_info?: string;
  workshopEvents?: WorkshopEvent[];
}

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const CATEGORIES = [
  { value: "yoga", label: "Yoga & Pilates", dot: "bg-[hsl(210,60%,55%)]", activeBg: "bg-[hsl(210,60%,55%)]" },
  { value: "poterie", label: "Poterie", dot: "bg-[hsl(40,76%,60%)]", activeBg: "bg-[hsl(40,76%,60%)]" },
];

export function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diffMin = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMin <= 0) return "";
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

export const FREQUENCY_OPTIONS = [
  { value: "hebdomadaire", label: "Toutes les semaines" },
  { value: "mensuel", label: "Tous les mois" },
  { value: "personnalise", label: "Personnalisé (calendrier)" },
];

export interface EventSlot {
  type: "recurring" | "ponctuel" | "multi-sessions";
  frequency: string;
  day: string; time: string; end_time: string; spots: number;
  date: string; price: number;
  reminder_template: string;
  modalities: string;
  customDates: string[];
  inclusions: string;
  card_yoga_count: number;
  complementary_info: string;
  _scheduleId?: string;
  _workshopId?: string;
  linkedDates: string[];
  _linkedGroup?: string;
  _linkedWorkshopIds?: string[];
}

export interface ActivityForm {
  name: string; description: string; long_description: string; category: string;
  instructor: string; image: string; images: string[]; spots: number;
  events: EventSlot[];
  default_reminder: string;
  default_modalities: string;
  intensity: string;
  reminder_timing: string;
  default_price: number;
  default_card_yoga_count: number;
  default_inclusions: string;
  default_complementary_info: string;
}

export const emptyEvent = (): EventSlot => ({
  type: "recurring", frequency: "hebdomadaire", day: "Lundi", time: "09:00", end_time: "10:00", spots: 12,
  date: "", price: 0, reminder_template: "", modalities: "", customDates: [],
  inclusions: "", card_yoga_count: 0, complementary_info: "",
  linkedDates: [],
});

export const emptyForm = (): ActivityForm => ({
  name: "", description: "", long_description: "", category: "yoga",
  instructor: "", image: "", images: [], spots: 12, events: [emptyEvent()],
  default_reminder: "", default_modalities: "",
  intensity: "none", reminder_timing: "1j",
  default_price: 0, default_card_yoga_count: 1, default_inclusions: "",
  default_complementary_info: "",
});
