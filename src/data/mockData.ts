// ============ TYPES ============

export interface Service {
  id: string;
  name: string;
  category: "yoga" | "poterie" | "atelier";
  description: string;
  image: string;
  duration: string;
  price?: string;
  maxParticipants?: number;
}

export interface CourseSchedule {
  id: string;
  name: string;
  day: string;
  time: string;
  duration: string;
  instructor: string;
  spots: number;
  spotsLeft: number;
}

export interface PricingCard {
  id: string;
  name: string;
  sessions: number | "illimité";
  price: number;
  validity: string;
  popular?: boolean;
}

export interface Workshop {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  price: number;
  spots: number;
  spotsLeft: number;
  category: "poterie" | "bien-etre";
  image: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  service: string;
  status: "confirmé" | "annulé" | "liste d'attente";
  instructor: string;
}

export interface ClientCard {
  id: string;
  name: string;
  totalSessions: number;
  usedSessions: number;
  expiresAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  credits: number;
  totalReservations: number;
  joinedAt: string;
}

// ============ DATA ============

export const services: Service[] = [
  {
    id: "yoga",
    name: "Yoga & Pilates",
    category: "yoga",
    description: "Vinyasa, Yin, Pilates, Prénatal... Trouvez le cours qui vous correspond parmi nos 20+ créneaux hebdomadaires.",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop",
    duration: "1h - 1h15",
  },
  {
    id: "poterie",
    name: "Poterie",
    category: "poterie",
    description: "Initiez-vous au tour de potier, explorez les engobes ou peignez sur céramique dans notre atelier dédié.",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop",
    duration: "2h - 3h",
  },
  {
    id: "ateliers",
    name: "Ateliers & Stages",
    category: "atelier",
    description: "Qi Gong, Breathwork, méthode Wim Hof, Cérémonie Cacao... Des expériences uniques pour explorer le bien-être.",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
    duration: "Variable",
  },
];

export const yogaSchedule: CourseSchedule[] = [
  { id: "1", name: "Vinyasa Flow", day: "Mardi", time: "09:30", duration: "1h15", instructor: "Élodie", spots: 12, spotsLeft: 4 },
  { id: "2", name: "Pilates Mat", day: "Mardi", time: "12:15", duration: "1h", instructor: "Élodie", spots: 10, spotsLeft: 2 },
  { id: "3", name: "Yin Yoga", day: "Mardi", time: "18:30", duration: "1h15", instructor: "Élodie", spots: 12, spotsLeft: 7 },
  { id: "4", name: "Vinyasa Dynamique", day: "Mercredi", time: "09:30", duration: "1h15", instructor: "Élodie", spots: 12, spotsLeft: 0 },
  { id: "5", name: "Yoga Prénatal", day: "Mercredi", time: "14:00", duration: "1h", instructor: "Élodie", spots: 8, spotsLeft: 5 },
  { id: "6", name: "Pilates Reformer", day: "Jeudi", time: "10:00", duration: "1h", instructor: "Élodie", spots: 6, spotsLeft: 1 },
  { id: "7", name: "Yang/Yin", day: "Jeudi", time: "18:30", duration: "1h15", instructor: "Élodie", spots: 12, spotsLeft: 8 },
  { id: "8", name: "Vinyasa Flow", day: "Vendredi", time: "09:30", duration: "1h15", instructor: "Élodie", spots: 12, spotsLeft: 6 },
  { id: "9", name: "Pilates Mat", day: "Vendredi", time: "12:15", duration: "1h", instructor: "Élodie", spots: 10, spotsLeft: 3 },
  { id: "10", name: "Yin Restauratif", day: "Samedi", time: "10:00", duration: "1h15", instructor: "Élodie", spots: 12, spotsLeft: 9 },
];

export const pricingCards: PricingCard[] = [
  { id: "1", name: "Découverte", sessions: 3, price: 45, validity: "1 mois" },
  { id: "2", name: "Essentiel", sessions: 5, price: 70, validity: "2 mois" },
  { id: "3", name: "Régulier", sessions: 10, price: 130, validity: "3 mois", popular: true },
  { id: "4", name: "Passionné", sessions: 20, price: 240, validity: "5 mois" },
  { id: "5", name: "Illimité", sessions: 40, price: 440, validity: "6 mois" },
  { id: "6", name: "Cours à l'unité", sessions: 1, price: 18, validity: "Séance" },
];

export const workshops: Workshop[] = [
  {
    id: "w1", name: "Initiation au Tour", description: "Découvrez les bases du tournage : centrage, montée, ouverture. Repartez avec vos créations après cuisson.",
    date: "2026-04-12", time: "14:00", duration: "3h", price: 65, spots: 6, spotsLeft: 2, category: "poterie",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop",
  },
  {
    id: "w2", name: "Stage Tour & Engobe", description: "Approfondissez le tournage et découvrez la décoration aux engobes sur 2 jours.",
    date: "2026-04-19", time: "10:00", duration: "2 jours", price: 180, spots: 6, spotsLeft: 4, category: "poterie",
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&h=400&fit=crop",
  },
  {
    id: "w3", name: "Peinture sur Céramique", description: "Peignez et personnalisez des pièces en céramique biscuitée. Accessible à tous, même aux enfants !",
    date: "2026-04-26", time: "14:00", duration: "2h", price: 45, spots: 8, spotsLeft: 6, category: "poterie",
    image: "https://images.unsplash.com/photo-1607799279513-37fce04ceec0?w=600&h=400&fit=crop",
  },
  {
    id: "w4", name: "Qi Gong en Plein Air", description: "Séance de Qi Gong dans le jardin du studio pour harmoniser corps et esprit.",
    date: "2026-05-03", time: "09:00", duration: "1h30", price: 25, spots: 15, spotsLeft: 10, category: "bien-etre",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop",
  },
  {
    id: "w5", name: "Breathwork Transformationnel", description: "Atelier de respiration consciente pour libérer les tensions et accéder à un état de profonde relaxation.",
    date: "2026-05-10", time: "15:00", duration: "2h30", price: 55, spots: 12, spotsLeft: 7, category: "bien-etre",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop",
  },
  {
    id: "w6", name: "Méthode Wim Hof", description: "Respiration, méditation et immersion en eau froide. Repoussez vos limites !",
    date: "2026-05-17", time: "09:00", duration: "3h", price: 75, spots: 10, spotsLeft: 3, category: "bien-etre",
    image: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&h=400&fit=crop",
  },
  {
    id: "w7", name: "Cérémonie Cacao", description: "Une expérience sensorielle et spirituelle autour du cacao cérémoniel, accompagnée de méditation et chants.",
    date: "2026-05-24", time: "18:00", duration: "2h", price: 40, spots: 15, spotsLeft: 11, category: "bien-etre",
    image: "https://images.unsplash.com/photo-1511537190424-bbbab87ac5eb?w=600&h=400&fit=crop",
  },
];

export const teamMembers: TeamMember[] = [
  {
    id: "1", name: "Élodie", role: "Fondatrice & Professeure de Yoga",
    bio: "Passionnée de yoga depuis plus de 15 ans, Élodie a créé IgiStudio pour partager sa vision du bien-être holistique.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face",
  },
];

// ============ CLIENT MOCK DATA ============

export const mockReservations: Reservation[] = [
  { id: "r1", date: "2026-03-15", time: "09:30", service: "Vinyasa Flow", status: "confirmé", instructor: "Élodie" },
  { id: "r2", date: "2026-03-17", time: "18:30", service: "Yin Yoga", status: "confirmé", instructor: "Élodie" },
  { id: "r3", date: "2026-03-20", time: "09:30", service: "Vinyasa Flow", status: "liste d'attente", instructor: "Élodie" },
  { id: "r4", date: "2026-03-10", time: "12:15", service: "Pilates Mat", status: "confirmé", instructor: "Élodie" },
  { id: "r5", date: "2026-03-05", time: "10:00", service: "Yin Restauratif", status: "annulé", instructor: "Élodie" },
];

export const mockClientCards: ClientCard[] = [
  { id: "c1", name: "Carte Régulier", totalSessions: 10, usedSessions: 6, expiresAt: "2026-05-15" },
  { id: "c2", name: "Carte Découverte Poterie", totalSessions: 3, usedSessions: 1, expiresAt: "2026-04-01" },
];

// ============ ADMIN MOCK DATA ============

export const mockClients: Client[] = [
  { id: "cl1", name: "Sophie Martin", email: "sophie@email.com", phone: "06 12 34 56 78", credits: 4, totalReservations: 24, joinedAt: "2025-09-01" },
  { id: "cl2", name: "Lucas Dupont", email: "lucas@email.com", phone: "06 98 76 54 32", credits: 8, totalReservations: 12, joinedAt: "2025-11-15" },
  { id: "cl3", name: "Marie Leroy", email: "marie@email.com", phone: "06 55 44 33 22", credits: 0, totalReservations: 36, joinedAt: "2025-06-01" },
  { id: "cl4", name: "Thomas Bernard", email: "thomas@email.com", phone: "06 11 22 33 44", credits: 15, totalReservations: 8, joinedAt: "2026-01-10" },
  { id: "cl5", name: "Camille Petit", email: "camille@email.com", phone: "06 77 88 99 00", credits: 2, totalReservations: 18, joinedAt: "2025-08-20" },
];

export const adminReservations = [
  { id: "ar1", client: "Sophie Martin", service: "Vinyasa Flow", date: "2026-03-15", time: "09:30", status: "confirmé" as const },
  { id: "ar2", client: "Lucas Dupont", service: "Pilates Mat", date: "2026-03-15", time: "12:15", status: "confirmé" as const },
  { id: "ar3", client: "Marie Leroy", service: "Yin Yoga", date: "2026-03-15", time: "18:30", status: "liste d'attente" as const },
  { id: "ar4", client: "Thomas Bernard", service: "Vinyasa Flow", date: "2026-03-16", time: "09:30", status: "confirmé" as const },
  { id: "ar5", client: "Camille Petit", service: "Initiation au Tour", date: "2026-03-16", time: "14:00", status: "annulé" as const },
  { id: "ar6", client: "Sophie Martin", service: "Yang/Yin", date: "2026-03-17", time: "18:30", status: "confirmé" as const },
];
