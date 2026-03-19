

# Plan : Choix de date dans le tunnel + Planning par catégorie

## Problème 1 : Pas de choix de date pour les ateliers

Quand on clique "Réserver" sur un atelier poterie qui a plusieurs dates, le tunnel reçoit l'ID du premier workshop et sa date. Il charge ce workshop unique et verrouille la date. Le visiteur ne peut pas choisir une autre date.

### Solution

**Fichier : `src/components/ActivitiesView.tsx`**
- Modifier `handleBookGroup` pour les workshops standalone (non-linked) : au lieu d'envoyer `id` + `date` du premier workshop, envoyer uniquement le `name` en paramètre URL (ex: `/reserver?type=workshop&name=Initiation+poterie+au+tour`)

**Fichier : `src/pages/Reserver.tsx`**
- Ajouter un paramètre URL `name` en plus de `id`
- Quand `name` est fourni sans `date` : charger tous les workshops avec ce nom, extraire les dates futures
- Afficher un **sélecteur de date** (liste de boutons-dates cliquables) avant le résumé de réservation
- Une fois la date choisie, charger le workshop correspondant et poursuivre le flux normal
- Pour les workshops linked (multi-sessions), conserver le comportement actuel (toutes les dates sont incluses automatiquement)

```text
Flux corrigé :
Carte "Initiation poterie" → Réserver
  → Page /reserver?type=workshop&name=Initiation+poterie+au+tour
  → "Choisissez votre date" : [Sam 4 avril] [Sam 11 avril] [Sam 18 avril]
  → Clic sur une date → Résumé → Suite du tunnel
```

## Problème 2 : Planning par catégorie dans "Rythme de la semaine"

Le bloc collapsible "Rythme de la semaine" ne montre que le yoga. Le user veut un aperçu pour chaque catégorie, inspiré des plannings mensuels qu'Élodie partage sur Instagram.

### Solution

**Fichier : `src/components/PlanningTypeView.tsx`**
- Ajouter les `workshops` en props
- Créer 3 onglets/sections dans le bloc collapsible : **Yoga**, **Poterie**, **Ateliers**
- **Yoga** : grille L-M-M-J-V-S-D avec horaires récurrents (identique à l'actuel)
- **Poterie** : liste des prochains ateliers avec nom, date, horaire, places, prix — format liste verticale simple (pas la grille L-M-M, car les ateliers sont ponctuels)
- **Ateliers & Stages** : même format liste que poterie

```text
┌─ Rythme de la semaine ──────────────────┐
│ [Yoga] [Poterie] [Ateliers]             │
│                                          │
│ (onglet Poterie sélectionné)             │
│ ┌──────────────────────────────────────┐ │
│ │ Initiation poterie au tour           │ │
│ │ Sam 4/04 · 14h-16h · 65€ · 3 places │ │
│ │ Sam 11/04 · 14h-16h · 65€ · 2 places│ │
│ ├──────────────────────────────────────┤ │
│ │ Stage poterie tour & engobe          │ │
│ │ Sam 14/03 & 21/03 · 14h-16h30 · 170€│ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Fichier : `src/components/ActivitiesView.tsx`**
- Passer les `workshops` en props à `PlanningTypeView`
- Afficher le bloc pour toutes les catégories (retirer la condition `showPlanningType` limitée à yoga)

### Fichiers impactés

| Fichier | Modification |
|---------|-------------|
| `ActivitiesView.tsx` | Modifier `handleBookGroup` pour standalone, passer workshops à PlanningTypeView |
| `Reserver.tsx` | Ajouter chargement par `name`, sélecteur de dates |
| `PlanningTypeView.tsx` | Ajouter onglets catégorie + vue liste pour poterie/ateliers |

