export type Pole = "gestion" | "pilotage" | "production";
export type RecommendedAction = "automatiser" | "deleguer" | "simplifier" | "presence" | "flow" | "vigilance" | "transmission" | "decider" | "filtrer" | "ressourcer" | "nourrir";
export type BesoinType = "competence" | "outil" | "les_deux";

export type TimeAnswer = "peu" | "beaucoup" | "trop";
export type ChargeAnswer = "zen" | "gerable" | "epuisante";
export type EnvieAnswer = "adore" | "il_le_faut" | "deteste";

export interface MissionAnswers {
  temps?: TimeAnswer;
  charge?: ChargeAnswer;
  envie?: EnvieAnswer;
}

export interface MatriceMission {
  id: string;
  pole: Pole;
  mission: string;
  missionShort: string;
  outil: string;
  frequence: string;
  chargeMentaleRecommandee: string;
  arbitrageRecommande: string;
  recommendedAction: RecommendedAction;
  besoinType: BesoinType;
  featureSuggestion: string;
  featureDescription: string;
  tempsEstime: number; // heures/semaine estimées si "trop"
}

export const POLE_CONFIG: Record<Pole, { label: string; emoji: string; color: string }> = {
  gestion: { label: "Gestion", emoji: "🏛️", color: "bg-sky-500/15 text-sky-700 border-sky-500/30" },
  pilotage: { label: "Pilotage", emoji: "🧭", color: "bg-violet-500/15 text-violet-700 border-violet-500/30" },
  production: { label: "Production", emoji: "🔥", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
};

export const TIME_OPTIONS: { value: TimeAnswer; label: string; emoji: string }[] = [
  { value: "peu", label: "Peu", emoji: "⏱️" },
  { value: "beaucoup", label: "Beaucoup", emoji: "⏱️⏱️" },
  { value: "trop", label: "Trop", emoji: "⏱️⏱️⏱️" },
];

export const CHARGE_OPTIONS: { value: ChargeAnswer; label: string; emoji: string }[] = [
  { value: "zen", label: "Zen", emoji: "🧘" },
  { value: "gerable", label: "Gérable", emoji: "😌" },
  { value: "epuisante", label: "Épuisante", emoji: "🤯" },
];

export const ENVIE_OPTIONS: { value: EnvieAnswer; label: string; emoji: string }[] = [
  { value: "adore", label: "J'adore", emoji: "❤️" },
  { value: "il_le_faut", label: "Il le faut", emoji: "😐" },
  { value: "deteste", label: "Je déteste", emoji: "🤢" },
];

export const MATRICE: MatriceMission[] = [
  // === GESTION ===
  {
    id: "g1",
    pole: "gestion",
    mission: "L'Humain : Accueil, lien profs, recrutement, SAV clients, litiges",
    missionShort: "Accueil & lien humain",
    outil: "Face-à-face / WhatsApp",
    frequence: "Quotidien",
    chargeMentaleRecommandee: "Haute (Émotionnelle)",
    arbitrageRecommande: "Cœur de métier (Présence)",
    recommendedAction: "presence",
    besoinType: "competence",
    featureSuggestion: "Module de messagerie intégrée",
    featureDescription: "Centraliser les échanges clients et intervenants dans l'application pour gagner en clarté.",
    tempsEstime: 5,
  },
  {
    id: "g2",
    pole: "gestion",
    mission: "Les Réservations : Inscriptions, paiements, listes d'attente, annulations",
    missionShort: "Réservations & paiements",
    outil: "Logiciel dédié",
    frequence: "Automatisé",
    chargeMentaleRecommandee: "Basse (Si auto)",
    arbitrageRecommande: "À Automatiser (Indispensable)",
    recommendedAction: "automatiser",
    besoinType: "outil",
    featureSuggestion: "Module de Paiement & Réservation Automatique",
    featureDescription: "Gestion complète des inscriptions, paiements CB, listes d'attente et annulations — tout automatisé.",
    tempsEstime: 5,
  },
  {
    id: "g3",
    pole: "gestion",
    mission: "Le Lieu : Ménage lourd, maintenance four, stocks (thé, PQ), sécurité",
    missionShort: "Entretien du lieu",
    outil: "Check-list / Notion",
    frequence: "Quotidien/Hebdo",
    chargeMentaleRecommandee: "Moyenne (Physique)",
    arbitrageRecommande: "À Déléguer (Aide/Karma Yogi)",
    recommendedAction: "deleguer",
    besoinType: "les_deux",
    featureSuggestion: "Check-list d'entretien partagée",
    featureDescription: "Un tableau de suivi des tâches d'entretien, partageable avec des bénévoles ou aides.",
    tempsEstime: 4,
  },
  {
    id: "g4",
    pole: "gestion",
    mission: "L'Admin/Compta : Facturation, pointage banque, assurances, impôts",
    missionShort: "Administration & comptabilité",
    outil: "Logiciel compta / Excel",
    frequence: "Mensuel",
    chargeMentaleRecommandee: "Moyenne (Rigueur)",
    arbitrageRecommande: "À Automatiser (Via logiciel)",
    recommendedAction: "automatiser",
    besoinType: "outil",
    featureSuggestion: "Export comptable automatique",
    featureDescription: "Génération automatique des relevés et exports pour votre comptable.",
    tempsEstime: 3,
  },
  {
    id: "g5",
    pole: "gestion",
    mission: "L'Image : Réseaux sociaux, photos, newsletter, site web",
    missionShort: "Communication & image",
    outil: "Instagram / Canva",
    frequence: "Hebdo",
    chargeMentaleRecommandee: "Moyenne (Créative)",
    arbitrageRecommande: "À Simplifier (Planifier)",
    recommendedAction: "simplifier",
    besoinType: "les_deux",
    featureSuggestion: "Planificateur de contenu intégré",
    featureDescription: "Préparer et programmer vos publications depuis l'application.",
    tempsEstime: 3,
  },
  // === PILOTAGE ===
  {
    id: "p1",
    pole: "pilotage",
    mission: "Stratégie & Finance : Rentabilité, prix, investissements, analyse",
    missionShort: "Stratégie & finances",
    outil: "Tableur / Reporting",
    frequence: "Mensuel",
    chargeMentaleRecommandee: "Haute (Logique)",
    arbitrageRecommande: "Décider (La tête haute)",
    recommendedAction: "decider",
    besoinType: "outil",
    featureSuggestion: "Tableau de bord financier",
    featureDescription: "Vue synthétique de vos revenus, dépenses et rentabilité par activité.",
    tempsEstime: 2,
  },
  {
    id: "p2",
    pole: "pilotage",
    mission: "Curation & Vision : Choix des intervenants, style des ateliers, concepts",
    missionShort: "Vision & curation",
    outil: "Carnet / Moodboard",
    frequence: "Trimestriel",
    chargeMentaleRecommandee: "Moyenne (Intuition)",
    arbitrageRecommande: "Filtrer (Dire non)",
    recommendedAction: "filtrer",
    besoinType: "competence",
    featureSuggestion: "Carnet d'inspiration numérique",
    featureDescription: "Un espace pour collecter vos idées, moodboards et concepts d'ateliers.",
    tempsEstime: 1,
  },
  {
    id: "p3",
    pole: "pilotage",
    mission: "Préservation de soi : Sacraliser le repos, pratique perso, déconnexion",
    missionShort: "Préservation de soi",
    outil: "Agenda (Blocs OFF)",
    frequence: "Hebdo",
    chargeMentaleRecommandee: "Vitale",
    arbitrageRecommande: "Se ressourcer (Priorité)",
    recommendedAction: "ressourcer",
    besoinType: "competence",
    featureSuggestion: "Blocs de repos dans l'agenda",
    featureDescription: "Bloquer automatiquement des créneaux personnels dans votre planning.",
    tempsEstime: 0,
  },
  {
    id: "p4",
    pole: "pilotage",
    mission: "Veille & Adaptation : Formations, visites d'ateliers, écoute du marché",
    missionShort: "Veille & inspiration",
    outil: "Musées / Voyages",
    frequence: "Annuel",
    chargeMentaleRecommandee: "Basse (Nourricière)",
    arbitrageRecommande: "Se nourrir (Inspiration)",
    recommendedAction: "nourrir",
    besoinType: "competence",
    featureSuggestion: "Veille sectorielle simplifiée",
    featureDescription: "Recevoir des inspirations et tendances adaptées à votre univers.",
    tempsEstime: 1,
  },
  // === PRODUCTION ===
  {
    id: "pr1",
    pole: "production",
    mission: "Matière : Tournage, modelage, émaillage, recyclage terre",
    missionShort: "Travail de la matière",
    outil: "Carnet d'atelier",
    frequence: "Quotidien",
    chargeMentaleRecommandee: "Haute (Précision)",
    arbitrageRecommande: "Flow (Concentration)",
    recommendedAction: "flow",
    besoinType: "competence",
    featureSuggestion: "Suivi de production céramique",
    featureDescription: "Tracer vos pièces du tournage à la cuisson pour ne rien oublier.",
    tempsEstime: 0,
  },
  {
    id: "pr2",
    pole: "production",
    mission: "Technique : Cuissons, courbes de chauffe, défournement, ponçage",
    missionShort: "Cuissons & technique",
    outil: "Programmateur four",
    frequence: "Selon séchage",
    chargeMentaleRecommandee: "Haute (Risque)",
    arbitrageRecommande: "Vigilance (Expertise)",
    recommendedAction: "vigilance",
    besoinType: "competence",
    featureSuggestion: "Journal de cuisson numérique",
    featureDescription: "Enregistrer vos courbes de cuisson et résultats pour capitaliser sur votre expérience.",
    tempsEstime: 0,
  },
  {
    id: "pr3",
    pole: "production",
    mission: "Yoga : Préparation et guidage des séances, ajustements",
    missionShort: "Enseignement yoga",
    outil: "Tapis / Présence",
    frequence: "Quotidien",
    chargeMentaleRecommandee: "Haute (Énergie)",
    arbitrageRecommande: "Transmission (Don de soi)",
    recommendedAction: "transmission",
    besoinType: "competence",
    featureSuggestion: "Bibliothèque de séquences yoga",
    featureDescription: "Organiser et retrouver vos séquences de cours pour varier vos séances.",
    tempsEstime: 0,
  },
];

export type GapLevel = "aligned" | "adjustable" | "critical";

export function computeGap(
  answers: MissionAnswers,
  mission: MatriceMission
): GapLevel {
  if (!answers.temps || !answers.charge || !answers.envie) return "aligned";

  // If she loves it, it's always aligned regardless of recommendation
  if (answers.envie === "adore") return "aligned";

  const isHighTime = answers.temps === "trop" || answers.temps === "beaucoup";
  const isHighCharge = answers.charge === "epuisante";
  const isLowEnvie = answers.envie === "deteste";
  const canBeOptimized = ["automatiser", "deleguer", "simplifier"].includes(mission.recommendedAction);

  if (isHighTime && isHighCharge && isLowEnvie && canBeOptimized) return "critical";
  if ((isHighTime || isHighCharge) && canBeOptimized) return "adjustable";

  return "aligned";
}

export function computeFreeableHours(
  allAnswers: Record<string, MissionAnswers>
): number {
  let total = 0;
  for (const m of MATRICE) {
    const a = allAnswers[m.id];
    if (!a) continue;
    if ((a.temps === "trop" || a.temps === "beaucoup") && a.envie !== "adore") {
      total += m.tempsEstime;
    }
  }
  return total;
}

export function getLovedMissions(allAnswers: Record<string, MissionAnswers>): MatriceMission[] {
  return MATRICE.filter(m => allAnswers[m.id]?.envie === "adore");
}

export function getSuggestedFeatures(allAnswers: Record<string, MissionAnswers>): MatriceMission[] {
  return MATRICE.filter(m => {
    const gap = computeGap(allAnswers[m.id] || {}, m);
    return gap !== "aligned" && allAnswers[m.id]?.envie !== "adore";
  });
}
