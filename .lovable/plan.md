

## Plan d'implémentation — 6 chantiers

### 1. Afficher les places restantes (visiteur)

**Fiches d'activité** : Sur chaque carte (cours yoga et ateliers poterie), afficher `X places restantes` ou un badge rouge `Complet` si `spots_left === 0`.

**Fichiers** : `src/components/ActivitiesView.tsx` (CourseCard et WorkshopCard)

---

### 2. Planning Poterie style Calendly (visiteur)

Remplacer le planning actuel de la section Poterie dans `ActivitiesView.tsx` par un composant calendrier mensuel dédié :

- **Sous-filtres en haut** : boutons pour filtrer par type de poterie (Atelier, Initiation, etc.) extraits dynamiquement des noms d'ateliers poterie
- **Vue calendrier mensuel** : grille 7 colonnes (L-D), chaque jour avec un cercle vert (dispo) ou rouge (complet) si un atelier existe ce jour, gris sinon
- **Navigation mois** : flèches gauche/droite pour changer de mois
- **Au clic sur un jour** : afficher les créneaux de ce jour sous le calendrier (heure, nom, places)
- **Au clic sur un créneau** : lancer le processus de réservation existant via `onSwitchToPlanning`

**Fichier** : nouveau composant `src/components/PotteryCalendar.tsx`, intégré dans `ActivitiesView.tsx` en remplacement du planning actuel de la section Poterie

---

### 3. Multi-photos activités (admin + visiteur)

**DB** : Ajouter une colonne `images text[] DEFAULT '{}'` aux tables `courses` et `workshops` via migration.

**Admin (`Activites.tsx`)** : Dans l'onglet Description de l'éditeur, permettre l'upload de plusieurs photos (jusqu'à 5) stockées dans le bucket `activity-images`. Les URLs sont sauvegardées dans le champ `images[]`.

**Visiteur (`ActivitiesView.tsx`)** : Si `images.length > 1`, remplacer l'image statique par un carrousel simple (swipe/flèches) dans les cartes et les modales de description.

---

### 4. Supprimer la catégorie "bien-être" (rouge)

- **DB** : Supprimer les workshops `bien-etre` (3 entrées : Cérémonie Cacao, Wim Hof Avancé, Breathwork) et les réservations liées
- **Code** : Retirer `"bien-etre"` de `CATEGORY_FILTERS`, `CATEGORY_STYLES`, `VISIBLE_FILTERS` dans `ActivityFilterBar.tsx`
- Nettoyer `ActivitiesView.tsx` (supprimer section Ateliers & Stages, `wellbeingGroups`, `atelierMonthOffset`)
- Nettoyer `PlanningView.tsx` (retirer la légende bien-être)
- Nettoyer `PlanningTypeView.tsx`, `Discover.tsx`, `admin/PlanningType.tsx`
- Retirer l'asset `filter-ateliers.png` et son import

---

### 5. Nettoyer les intervenants (garder Élodie et Émilie)

- **DB** : Désactiver (mettre `active = false`) les 4 intervenants : Adeline, Gaëlle, Marc Antoine, Stéphanie
- Dissocier les cours/ateliers liés à ces intervenants (`SET instructor_id = NULL` ou les réassigner à Élodie)
- L'interface admin ne les affichera plus car elle filtre déjà sur `active = true`

---

### 6. Ajouter des participants depuis le planning admin

Dans `DailyView.tsx`, ajouter un bouton "Ajouter un participant" dans le dialogue de détail d'un bloc d'activité :

- Formulaire inline : nom du client + nombre de participants
- Insertion directe dans la table `reservations` avec les champs pré-remplis (date, heure, activity_name, course_id/workshop_id, status "confirmé")
- Rafraîchir la liste des participants après ajout

---

### Détails techniques

- **Migration SQL** : `ALTER TABLE courses ADD COLUMN images text[] DEFAULT '{}'; ALTER TABLE workshops ADD COLUMN images text[] DEFAULT '{}';`
- **Data cleanup SQL** : `DELETE FROM workshops WHERE category = 'bien-etre'; UPDATE instructors SET active = false WHERE name NOT IN ('Elodie', 'Emilie');`
- **Nouveau composant** : `PotteryCalendar.tsx` (~150 lignes)
- **Fichiers modifiés** : `ActivitiesView.tsx`, `ActivityFilterBar.tsx`, `PlanningView.tsx`, `PlanningTypeView.tsx`, `DailyView.tsx`, `Activites.tsx`, `Discover.tsx`, `admin/PlanningType.tsx`

