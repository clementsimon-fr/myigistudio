

# Plan : Planning inline par catégorie (sans bandeau "À venir")

## Résumé

Supprimer le bloc Programme collapsible central. À la place, intégrer un mini-planning directement dans chaque section de catégorie (au-dessus des cartes). Supprimer le bouton calendrier des cartes.

## Changements

### `ActivitiesView.tsx`

1. **Retirer le `PlanningTypeView` collapsible** (lignes 356-359) — plus de Programme centralisé
2. **Retirer le bouton calendrier** (`CalendarRange`) de chaque carte (yoga ligne 384-386, workshop lignes 235-237 et 248-249)
3. **Retirer les refs et imports** liés à `PlanningTypeView`, `planningRef`, `openProgramme`, `handleProgrammeEventClick`
4. **Ajouter un mini-planning inline dans chaque section** :
   - **Yoga** : `RecurringGrid` (exporté depuis `PlanningTypeView`) inséré entre le titre "Yoga & Pilates" et la grille de cartes
   - **Poterie** : liste des prochaines dates du mois (réutiliser `MonthWorkshops` filtré poterie) entre le titre et les cartes
   - **Ateliers** : même chose filtré bien-être

### `PlanningTypeView.tsx`

5. **Exporter `RecurringGrid` et `MonthWorkshops`** comme named exports pour réutilisation inline
6. Le composant principal `PlanningTypeView` reste exporté (utilisé côté admin) mais n'est plus appelé côté visiteur

### `FrequencyDialog.tsx`

7. Vérifier si encore utilisé — si le bouton calendrier est supprimé des cartes, le `FrequencyDialog` n'est plus déclenché. On conserve l'import au cas où mais on retire les appels `onFrequency` / `openFrequency`.

## Résultat visuel

```text
── Yoga & Pilates ─────────────────────
│ Grille L-M-M-J-V-S-D (RecurringGrid)│  ← inline, visible
├──────────────────────────────────────┤
│ [Carte Yoga] [Carte Pilates]         │
────────────────────────────────────────

── Poterie ────────────────────────────
│ Sam 29/03 · 14h-16h · Initiation    │
│ Sam 05/04 · 14h-16h · Initiation    │  ← liste dates inline
├──────────────────────────────────────┤
│ [Carte Initiation] [Carte Stage]     │
────────────────────────────────────────

── Ateliers & Stages ──────────────────
│ Dim 30/03 · 10h-12h · Atelier       │  ← liste dates inline
├──────────────────────────────────────┤
│ [Carte Atelier]                      │
────────────────────────────────────────
```

Zéro clic pour voir les plannings. Chaque ligne de planning reste cliquable → tunnel de réservation.

