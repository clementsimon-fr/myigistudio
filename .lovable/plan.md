

# Plan : Simplifier l'UX multi-sessions dans l'éditeur admin

## Problème

L'éditeur multi-sessions utilise un `CustomDatesPicker` (calendrier + badges) qui cause des duplications massives de dates. L'utilisateur veut la **même UX simple** que les événements ponctuels : des champs inline sans calendrier complexe.

## Solution

Remplacer le `CustomDatesPicker` pour le type multi-sessions par une UX simple en liste :
- Afficher les dates liées comme des champs `<input type="date">` inline, avec un petit bouton "+" pour ajouter une date supplémentaire et "×" pour en retirer
- Conserver les champs horaire, places et prix communs (identique au ponctuel)
- Pas de calendrier, pas de badges — juste des inputs date simples

## Modifications

### Fichier : `src/pages/admin/Activites.tsx`

1. **Remplacer le bloc multi-sessions** (lignes 647-655) : au lieu d'utiliser `CustomDatesPicker`, afficher :
   - Une rangée avec les champs horaire (time → end_time), places
   - En dessous, la liste des `linkedDates` sous forme de champs `<input type="date">` avec un bouton × pour chaque
   - Un bouton "+ Ajouter une date" pour ajouter une entrée vide

```text
┌─────────────────────────────────────────────┐
│ [Multi-sessions ▾]           [ⓘ] [🗑]      │
│                                              │
│ [09:00] → [12:00]    👥 [8]                  │
│                                              │
│ 📅 [2026-03-14] ×                            │
│ 📅 [2026-03-21] ×                            │
│ [+ Ajouter une date]                         │
│                                              │
│ [180] € ou 💳 [0] carte yoga                 │
└─────────────────────────────────────────────┘
```

2. **Dédupliquer les linkedDates** lors du chargement dans `openEdit` (lignes 1028-1041) : ajouter un `[...new Set(...)]` pour éviter les doublons existants en base.

### Fichiers impactés
- `src/pages/admin/Activites.tsx` — remplacement du bloc multi-sessions + déduplication au chargement

