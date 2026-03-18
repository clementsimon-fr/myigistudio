

# Plan : Corrections et améliorations pré-démo

## Résumé des changements

8 fichiers modifiés pour couvrir les 10 demandes.

---

## 1. PlanningView — "Afficher plus d'informations" + supprimer badge "Cours"

**`src/components/PlanningView.tsx`**

- Dans le dialog de détail (ligne 306-337) :
  - Supprimer le badge `"Cours"` / `"Atelier"` (ligne 313)
  - Ajouter un état `showMore` et un bouton "Afficher plus d'informations" sous la description courte
  - Au clic, afficher : `long_description` (fetch depuis course/workshop), inclusions, détails intervenant, planning type de l'activité
- Enrichir le type `ActivityBlock` avec `long_description`, `inclusions`, `frequency` (fetch depuis les données sources courses/workshops dans le `dayBlocks` useMemo)

## 2. Vérification des détails non intégrés

### 2a. Admin Activités — filtres plus gros
**`src/pages/admin/Activites.tsx`** (lignes 554-573)
- Augmenter la taille des badges filtres : `text-xs` → `text-sm`, ajouter `h-8 px-3` pour correspondre au style PlanningType

### 2b. Mobile overflow — pages admin et client
**Fichiers** : `PlanningType.tsx`, `BonsCadeaux.tsx`, `Contrat.tsx`, `ClientLayout.tsx`
- Vérifier et ajouter `overflow-x-hidden` sur les conteneurs principaux
- `PlanningType.tsx` : la table `min-w-[500px]` est trop large pour mobile — réduire à `min-w-[420px]`, ajouter `-mx-2 px-2` pour le scroll

### 2c. Dashboard — supprimer badge "LIVE"
**`src/pages/admin/Dashboard.tsx`** (ligne 143)
- Supprimer `<Badge className="bg-destructive...">LIVE</Badge>`

### 2d. Auto-connexion au chargement
**`src/contexts/DemoContext.tsx`** (lignes 105-111)
- Ne plus restaurer le profil depuis `localStorage` au chargement initial
- Modifier l'initialisation de `currentProfile` pour retourner `null` systématiquement (ignorer le localStorage)
- Garder la persistence en cours de session mais pas entre les rechargements de page

## 3. Admin Activités — renommer vues

**`src/pages/admin/Activites.tsx`**
- Supprimer le bouton "Liste" (ligne 543-544)
- Renommer "Cards" → "Activités" (ligne 546-548)
- Renommer le bouton "Calendrier" en "Planning et réservations" (ligne 549-551)
- Ajuster le `viewMode` par défaut si actuellement "list" → "cards"
- Supprimer la branche `viewMode === "list"` du rendu (lignes 607-663)

## 4. Admin Activités — popup calendrier : "Éditer activité" + "Modifier les inscriptions"

**`src/components/admin/ActivityCalendar.tsx`**
- Dans le detail popup, renommer "Éditer" en "Éditer activité"
- Ajouter un bouton "Modifier les inscriptions" qui ouvre un sous-dialog permettant :
  - Afficher la liste des inscrits actuels (depuis `reservations` filtrées par date/activité)
  - Bouton "Ajouter participant" : formulaire prénom/nom, insère dans `reservations`
  - Bouton "Supprimer" à côté de chaque inscrit : supprime la réservation + met à jour `spots_left`

## 5. Récapitulatif participants dans PaymentSummary

**`src/components/booking/PaymentSummary.tsx`**
- Ajouter une prop `extraParticipants: ExtraParticipant[]`
- Avant le bloc des conditions (ligne 147), afficher un bloc récapitulatif :
  - "Participants" : nom principal + liste des participants supplémentaires
  
**`src/pages/Reserver.tsx`**
- Passer `extraParticipants` en prop au composant `PaymentSummary`

## 6. Admin PlanningType — horaires au lieu des croix + filtre

**`src/pages/admin/PlanningType.tsx`**
- Ajouter un state `showTimes` (boolean, default `true`)
- Ajouter un bouton toggle "Horaires" / "Points" dans la toolbar
- Modifier `renderTimeCell` :
  - Si `showTimes=true` : afficher les horaires directement (`09:00-10:00`) dans la cellule au lieu du `✕`
  - Si `showTimes=false` : afficher le `✕` actuel
- Ajuster la largeur des colonnes pour accommoder les horaires (`w-16 sm:w-20`)

## 7. Page visiteur ActivitiesView — récurrent/ponctuel + lien planning

**`src/components/ActivitiesView.tsx`**
- Dans chaque carte d'activité, ajouter un badge :
  - "Récurrent" pour les courses
  - "Ponctuel" pour les workshops
- Dans la vue planning type (WeekDots), rendre les jours actifs cliquables → `onSwitchToPlanning({ filter, activity, date })`
- Dans les cartes workshop, au clic sur la date/heure, naviguer vers le planning filtré

## 8. PricingSection — "Choisir" → "Découvrir" avec popup

**`src/components/home/PricingSection.tsx`**
- Remplacer le bouton "Choisir" (lien vers `/yoga`) par un bouton "Découvrir" qui ouvre un Dialog
- Le Dialog affiche :
  - "Pour prendre une formule, vous devez avoir un compte ; ou choisir la formule au moment de la réservation."
  - Bouton "Connexion" → navigate vers `/login`
  - Bouton "Réserver une séance" → navigate vers `/?view=planning&filter=yoga`

## Fichiers modifiés

| Fichier | Changements |
|---------|------------|
| `PlanningView.tsx` | "Afficher plus d'infos" dans popup, supprimer badge "Cours", enrichir ActivityBlock |
| `Activites.tsx` | Filtres plus gros, supprimer vue Liste, renommer Cards→Activités, Calendrier→Planning et réservations |
| `ActivityCalendar.tsx` | Renommer "Éditer" → "Éditer activité", ajouter "Modifier les inscriptions" |
| `PlanningType.tsx` | Horaires dans les cellules + toggle, fix mobile overflow |
| `Dashboard.tsx` | Supprimer badge "LIVE" |
| `DemoContext.tsx` | Ne pas auto-connecter au chargement |
| `PaymentSummary.tsx` | Récapitulatif participants avant conditions |
| `Reserver.tsx` | Passer extraParticipants à PaymentSummary |
| `ActivitiesView.tsx` | Badges récurrent/ponctuel, liens cliquables vers planning |
| `PricingSection.tsx` | "Découvrir" avec popup au lieu de "Choisir" |

