

## Analyse et avis

Excellente idée. Actuellement, **Activités** (`/`) et **Planning** (`/calendrier`) sont deux pages distinctes qui :
- Chargent chacune leur propre Navbar, Footer, Hero, et filtres
- Font chacune leurs propres appels à la base de données (courses, workshops, instructors)
- Provoquent une navigation complète (unmount/remount) quand on passe de l'une à l'autre

En les fusionnant en une seule page avec un **toggle de vue** (Activités / Planning), on gagne :
- **Chargement unique** des données (courses, workshops, schedules, instructors)
- **Transition instantanée** entre les deux vues (pas de navigation, juste un changement d'état)
- **Filtres partagés** : changer un filtre dans la vue Activités reste actif quand on bascule vers Planning

---

## Plan d'implémentation

### 1. Créer une page unifiée `src/pages/Discover.tsx`

- Contient le Navbar, Footer, Hero mobile, et le `ActivityFilterBar`
- Gère un état `view: "activites" | "planning"` (initialisé via `?view=planning` dans l'URL)
- Charge **une seule fois** toutes les données : `courses`, `workshops`, `course_schedules`, `instructors`
- Selon `view` :
  - **"activites"** → affiche les cartes catalogue (contenu actuel de `Activites.tsx`) + PricingSection + TeamSection
  - **"planning"** → affiche le calendrier semaine (contenu actuel de `Calendrier.tsx`)

### 2. Modifier `ActivityFilterBar`

- Remplacer les `<Link>` des onglets Activités/Planning par des **boutons** qui appellent un callback `onViewChange`
- Nouveau prop : `view: "activites" | "planning"` + `onViewChange: (v) => void`
- Les onglets deviennent visibles sur **desktop aussi** (pas seulement mobile), puisqu'il n'y a plus de navigation distincte

### 3. Mettre à jour le Navbar

- Remplacer les deux liens "Les activités" / "Planning & réservation" par un **seul lien** "Nos activités" pointant vers `/`
- Sur desktop, on peut garder les deux liens mais ils pointent vers `/?view=activites` et `/?view=planning`

### 4. Mettre à jour les routes (`App.tsx`)

- `/` et `/activites` → `<Discover />`
- `/calendrier` → `<Navigate to="/?view=planning" replace />` (rétro-compatibilité)
- Conserver le support des query params existants (`filter`, `activity`, `date`)

### 5. Factoriser le chargement des données

- Extraire un hook `useActivitiesData()` qui charge courses, workshops, schedules, instructors en un seul `Promise.all`
- Utilisé une seule fois dans `Discover.tsx`, les données sont passées en props aux sous-composants

### 6. Nettoyer

- Supprimer `src/pages/Activites.tsx` et `src/pages/Calendrier.tsx` (code déplacé dans Discover)
- Extraire les cartes activités dans un composant `ActivitiesView` et le calendrier dans `PlanningView`

