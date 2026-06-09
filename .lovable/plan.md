# Analyse du document Classeur1.xlsx

J'ai extrait **11 demandes** classées par priorité (1 = haute, 4 = basse). Voici le plan d'implémentation regroupé.

---

## 🔴 Priorité 1 — À traiter en premier

### 1. Supprimer "Ateliers & Stages" partout
Retirer toute trace d'ateliers/stages de l'app (front visiteur, admin, planning, types, filtres). Le modèle devient : **Cours (yoga/pilates) + Activités poterie**, sans la notion "atelier".
- **Fichiers** : `ActivitiesView.tsx`, `ActivityFilterBar.tsx`, `PlanningView.tsx`, `admin/Activites.tsx`, `admin/AteliersAdmin.tsx` (suppression), `Discover.tsx`, types Supabase.
- **DB** : décider du sort de la table `workshops` (renommer en `pottery_events` ou fusionner dans `courses`).

### 2. Refonte fiche activité (clic DESCRIPTION) — visiteur
Au clic sur DESCRIPTION, afficher sous la photo :
- Titre **Description** + paragraphe
- Champ **Intensité**
- Titre **Planning type** + planning filtré sur l'activité
- Titre **Les tarifs** + formules (UX identique au popup "Formules Cartes Yoga", **sans CTA**)
- **Supprimer** le bloc "Jour de la semaine"
- **Fichier** : `ActivitiesView.tsx` (modale description), réutiliser `PurchaseOptions/CardGrid` en mode lecture seule.

### 3. Déplacer badge "X places restantes"
Le badge doit être à côté de "Prochain cours" (pas en bas).
- **Fichier** : `ActivitiesView.tsx` (CourseCard).

### 4. Unifier UX "Formules cartes yoga"
Partout où les cartes yoga sont présentées (accueil, fiche activité, modale réservation), utiliser la même UX que `CardGrid` du processus de réservation.
- Ajouter le texte : *"... Achetez une carte, ou plusieurs, et utilisez vos cours quand vous le souhaitez."*
- Ajouter sous le badge des cours un **badge réduction** (calcul auto : économie vs prix unitaire).
- **Fichiers** : `home/PricingSection.tsx`, `FormulaInfoModal.tsx`, `booking/PurchaseOptions.tsx` (CardGrid commun extrait dans un composant partagé).

### 5. Refonte admin "Activités et réservations"
Restructuration majeure de l'admin :
- Autant de filtres que d'activités (dynamique).
- Rubrique **Activités** : édition des fiches uniquement. Clic = panneau qui glisse vers le bas (drawer). Plus de dates sur la carte.
- Rubrique **Planning et réservations** : consultation des réservations + ajout de dates.
- Bouton **"Ajouter un événement"** disponible uniquement dans la vue **Mois** (pas par clic sur une case vide).
- Au clic sur "Ajouter un événement", un **META-bloc** apparaît :
  - Bloc 1 : sélecteur d'activité (dropdown)
  - Bloc 2 : type d'événement avec 3 boutons :
    1. **Une date** → clic sur date → fenêtre (début, heure début/fin, places, prix €/carte, notes)
    2. **Plusieurs dates même créneau** → clic multi-dates → paramétrage unique
    3. **Dates connectées (stage)** → clic multi-dates → paramétrage heure par date (linked_group)
- **Fichiers** : `admin/Activites.tsx`, `admin/PlanningType.tsx`, `admin/Reservations.tsx`, nouveau composant `EventCreatorMeta.tsx`.

### 6. Simplification édition activité (admin)
- "Détailler l'événement" passe dans la rubrique **Description** (commun à tous les events).
- Plus de bouton "Détailler" dans **Événements**.
- Saisie prix/carte yoga dans **Description**.
- Bouton **"Inclusions"** à côté du prix (ex: "le goûter est compris") → affiché en **bulle info** côté visiteur.
- **Fichier** : `admin/Activites.tsx`.

### 7. Admin Conditions
- Supprimer le champ "Type" (titre suffit).
- Corriger le bouton **Supprimer une condition** (ne fonctionne pas).
- **Fichier** : `admin/Conditions.tsx`.

---

## 🟡 Priorité 3 — Ajustements

### 8. Accueil — texte
- Déplacer **"Yoga, Pilates & Poterie"** sous le titre **MyIgistudio**.
- **Fichier** : page d'accueil / Hero.

### 9. Accueil — footer
- Ajouter **"Développé avec passion par TCC"** en bas du site.
- **Fichier** : `layout/Footer.tsx`.

### 10. Bug duplication activité (à vérifier)
- Lors de l'ajout d'un événement dans une activité existante puis validation, l'activité est dupliquée.
- **À tester** : la logique de regroupement par `name` dans `Activites.tsx` devrait déjà couvrir le cas, mais à valider en conditions réelles.

---

## 🟢 Priorité 4 — Fonctionnalité majeure

### 11. Import Excel clients (admin)
- Page admin permettant d'uploader un fichier Excel avec colonnes clients (Simplybook, Calendly, Stripe).
- Stockage dans une nouvelle table `client_imports` (email comme clé).
- À la création d'un compte client : détection auto via email → proposition d'importer ses anciennes données.
- Vue admin : voir quels clients ont réalisé leur import.
- **Fichiers** : nouvelle page `admin/ImportClients.tsx`, migration DB (table `client_imports` + colonne `imported_from` sur `profiles`), logique dans `Register.tsx`.
- **Note** : Élodie devra transmettre le fichier Excel exemple pour valider le mapping des colonnes.

---

## Ordre d'exécution proposé

Je propose de traiter d'abord toutes les **priorités 1** (chantiers 1 → 7), puis priorités 3 (8 → 10), enfin la fonctionnalité d'import (11).

**Question avant de lancer** : veux-tu que je commence par **tout faire d'un bloc** ou que je traite par lots (par ex. lot A = #1, #2, #3 ; lot B = #4, #6, #7 ; lot C = #5 ; lot D = #8-10 ; lot E = #11) ? Le lot C (refonte admin réservations) et le lot E (import) sont les plus lourds.
