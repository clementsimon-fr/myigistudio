

# Plan : Simplifier les vues planning visiteur

## Diagnostic

Il y a actuellement 3 vues temporelles côté visiteur, ce qui crée de la confusion :

1. **Planning type** (grille L-M-M-J-V-S-D) — pertinent pour les cours récurrents, mais inutile pour les ateliers ponctuels (pas de date, frustrant)
2. **Planning semaine** (vue calendrier avec dates réelles) — redondant avec le tunnel de réservation
3. **Cartes d'activités** — la vue principale

## Proposition de simplification

### A. Planning type = uniquement les cours récurrents

Retirer les workshops (poterie, ateliers, stages) de la grille "Semaine type". Cette vue ne montre que les **cours hebdomadaires** (yoga, pilates). C'est exactement ce que l'admin veut montrer : "lundi = yoga, mardi = pilates, samedi = poterie récurrente".

Les ateliers ponctuels et multi-sessions restent uniquement dans les cartes d'activités avec leurs vraies dates.

### B. Supprimer la vue Planning semaine (PlanningView) côté visiteur

Cette vue calendrier hebdomadaire fait doublon avec les cartes + le tunnel de réservation. On la retire du parcours visiteur. Le bouton "Réserver" sur une carte mène directement au tunnel avec choix de date.

### C. Conserver le Planning type comme section intégrée

Au lieu d'une vue séparée, le planning type devient une **section en haut** de la page Activités (au-dessus des cartes), visible quand le filtre est "Toutes" ou "Yoga". Compact, informatif, pas de navigation supplémentaire.

### D. Admin : aucun changement

Le planning type admin (`/admin/planning-type`) reste identique — l'admin garde sa vue macro complète.

## Modifications techniques

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `PlanningTypeView.tsx` | Filtrer pour n'afficher que les courses (retirer workshops) |
| `ActivitiesView.tsx` | Intégrer PlanningTypeView en section au-dessus des cartes |
| `Discover.tsx` | Supprimer le mode `planning`, retirer les refs à PlanningView |
| `ActivityFilterBar.tsx` | Retirer le bouton retour planning (plus de vue planning) |
| `ClientSidebar.tsx` | Changer le lien "Planning" → `/?view=planning-type` en simple `/` |
| `PlanningView.tsx` | Conserver le fichier (utilisé potentiellement admin) mais ne plus l'appeler côté visiteur |

### Résumé du flux simplifié

```text
Visiteur arrive sur /
  → Grille "Semaine type" (cours récurrents uniquement)
  → Cartes d'activités (cours + ateliers avec dates)
  → Clic "Réserver" → Tunnel /reserver (avec choix de date)
```

Pas de navigation entre vues, pas de confusion entre grille sans dates et calendrier avec dates.

