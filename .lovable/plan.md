# Plan — 3 chantiers Excel restants

Ces 3 sujets sont volumineux. Je propose de les enchaîner dans cet ordre (du plus impactant côté démo au moins risqué) et de te livrer chacun comme un lot validable avant de passer au suivant.

---

## Lot A — Refonte "Activités et Réservations" (ligne 12, priorité 1)

C'est le plus gros chantier. Refonte complète de l'admin `/admin/activites`.

### Structure cible
- **Onglet "Activités"** : grille des fiches activités uniquement.
  - Plus de dates affichées sur la carte (on retire les badges date/heure).
  - Clic sur une carte → **drawer qui s'ouvre par le bas** (composant `Sheet` shadcn side=bottom) avec l'édition complète de la fiche.
  - Pas de bouton "Ajouter un événement" ici.
- **Onglet "Planning et réservations"** : consultation des réservations + ajout de dates.
  - Vues Semaine / Mois (conservées).
  - Bouton **"Ajouter un événement"** visible **uniquement en vue Mois**.
  - Clic sur case vide du calendrier = aucune action (désactivé).
- **Filtres** : afficher un filtre par activité existante (autant de chips que d'activités en base).

### Création d'événement (META-bloc)
Au clic sur "Ajouter un événement", un dialog s'ouvre avec :

**Bloc 1 — Activité** : dropdown listant toutes les activités.

**Bloc 2 — Type d'événement** (3 boutons radio) :
1. **Date unique** → sélection 1 date + 1 formulaire (date début, h début, h fin, places, prix €, prix carte, notes).
2. **Plusieurs dates même créneau** → sélection multi-dates dans le calendrier, puis 1 seul formulaire appliqué à toutes.
3. **Dates connectées (stage)** → sélection multi-dates, puis formulaire **par date** (h début/fin propres à chacune), partageant places/prix/notes.

### Fichiers principaux
- `src/pages/admin/Activites.tsx` (split en onglets)
- nouveau `src/components/admin/ActivityEditDrawer.tsx`
- nouveau `src/components/admin/AddEventDialog.tsx` (META-bloc)
- `src/components/admin/PlanningView.tsx` (filtres + Mois/Semaine)

### Modèle de données
- Bouton 1 & 2 → insertions dans `course_schedules` (1 ligne par date).
- Bouton 3 (stage) → 1 ligne `workshops` + N lignes `planned_sessions` liées.
- Aucune migration nécessaire a priori (tables existantes suffisent).

---

## Lot B — Refonte édition activité admin (ligne 9, priorité 1)

Simplifie la fiche d'édition d'une activité (depuis le drawer du Lot A, ou la page actuelle si on commence par B).

### Changements
1. La rubrique **"Description"** absorbe :
   - le contenu actuel "Détailler l'événement" (déplacé ici, car commun à tous les événements d'une même activité),
   - la saisie des **prix € et cartes yoga** + **inclusions** (champ libre type "Le goûter est compris").
2. La rubrique **"Événements"** : suppression du bouton "Détailler" sur chaque ligne (info déjà dans Description).
3. Côté **visiteur** (tunnel réservation) : à côté du prix € ou prix carte, un bouton/icône **bulle info** qui affiche les inclusions saisies.

### Fichiers principaux
- `src/components/admin/ActivityEditor.tsx` (réorganisation des sections)
- `src/components/admin/EventsSection.tsx` (retrait bouton Détailler)
- schéma `courses` / `workshops` : ajouter colonne `inclusions text` si absente
- tunnel réservation : `BookingFlow.tsx` (ou équivalent) → tooltip à côté du prix

### Migration
Ajout colonne `inclusions text` sur `courses` (et `workshops` si besoin), nullable.

---

## Lot C — Import clients Excel (ligne 4, priorité 4)

Outil admin pour importer un .xlsx de fiches clients (issues de SimplyBook/Calendly/Stripe).

### Fonctionnement
- Nouvelle page `/admin/import-clients` (ou section dans Bonjour).
- Upload `.xlsx` → parsing côté client avec `xlsx` (sheetjs).
- Mapping colonnes : email (obligatoire), prénom, nom, téléphone, cartes restantes, notes.
- Preview tableau avec lignes valides / erreurs.
- Bouton "Importer" → insertion en masse dans `profiles` (avec flag `imported=true`, sans `user_id` car pas encore d'auth).
- À la création d'un compte avec un email correspondant, le profil est automatiquement rattaché (logique déjà demandée par Élodie).

### Fichiers
- nouveau `src/pages/admin/ImportClients.tsx`
- dépendance `xlsx` (déjà présente ? sinon `bun add xlsx`)
- migration : ajouter `imported boolean default false` + `imported_email text` sur `profiles` si pas déjà géré.

---

## Ordre proposé et validation

1. **Lot B** d'abord (1-2 itérations) — plus rapide, et débloque la logique "inclusions" affichée côté visiteur.
2. **Lot A** ensuite (2-3 itérations) — le plus gros, mais auto-contenu une fois B fait.
3. **Lot C** en dernier (1 itération) — peut être livré après la démo si nécessaire.

**Question** : on démarre par **Lot B** comme proposé, ou tu préfères attaquer directement le **Lot A** (le plus visible en démo) ?
