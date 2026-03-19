

# Plan : Programme de la semaine + Programme du mois

## Concept UX

Remplacer le bloc actuel "Rythme de la semaine" par deux sous-vues accessibles via un toggle simple :

### "Cette semaine"
Liste chronologique jour par jour (lundi → dimanche) de **tous** les événements de la semaine en cours :
- Cours récurrents (yoga, pilates) calculés depuis `course_schedules` + date réelle du jour
- Ateliers ponctuels (poterie, bien-être) dont la date tombe cette semaine

Chaque ligne : **Jour · Horaire · Nom · Catégorie (pastille couleur)**. Compact, scannable.

```text
Lun 24 mar  · 10h00–11h00 · Yoga doux         🟢
Mar 25 mar  · 18h30–19h30 · Pilates            🟢
Sam 29 mar  · 14h00–16h00 · Initiation poterie 🟤
```

### "Ce mois"
Deux sections empilées :

1. **Cours récurrents** — la grille L-M-M-J-V-S-D existante (YogaGrid) étendue à toutes les catégories récurrentes. Montre le rythme sans répéter les dates.

2. **Événements ponctuels** — liste des ateliers/stages du mois en cours, groupés par catégorie. Format identique au WorkshopList actuel.

Cela évite de surcharger : les Pilates du mercredi apparaissent une seule fois dans la grille, pas 4 fois.

## Navigation

Toggle simple au-dessus du contenu : `[Cette semaine]  [Ce mois]` — deux boutons style TabsTrigger. Pas d'onglets de catégories en plus (tout est mélangé, les pastilles de couleur suffisent à distinguer).

## Modifications techniques

### `PlanningTypeView.tsx` — refonte complète

- Remplacer les onglets par catégorie (Yoga/Poterie/Ateliers) par un toggle **Semaine / Mois**
- **Vue Semaine** : nouveau composant `WeekProgram`
  - Calculer les dates lundi→dimanche de la semaine courante
  - Pour chaque `course_schedule`, mapper le jour (Lundi, Mardi...) vers la date réelle de la semaine
  - Fusionner avec les `workshops` dont la date tombe dans la semaine
  - Trier chronologiquement, afficher jour par jour
  - Pastille couleur par catégorie via `CATEGORY_STYLES`
- **Vue Mois** : nouveau composant `MonthProgram`
  - Section 1 : grille récurrente (réutiliser `YogaGrid` mais avec **tous** les cours récurrents, pas uniquement yoga)
  - Section 2 : liste des workshops ponctuels du mois en cours, groupés par catégorie
  - Titre du mois affiché (ex: "Mars 2026")
- Le bouton d'ouverture devient "Programme" au lieu de "Rythme de la semaine"

### `ActivitiesView.tsx` — aucun changement structurel

Les props passées à `PlanningTypeView` (courses, schedules, workshops) restent identiques.

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `PlanningTypeView.tsx` | Refonte : toggle Semaine/Mois, composants WeekProgram et MonthProgram |

