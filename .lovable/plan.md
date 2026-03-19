

# Plan : Dates liées (multi-sessions)

## Contexte

Le screenshot montre un stage de poterie qui se déroule sur **2 samedis consécutifs** (ex: 14 & 21 mars). Ces dates forment un **groupe indissociable** : on réserve le lot, pas une date isolée. Actuellement, chaque date est un workshop indépendant sans notion de liaison.

## Principe

Introduire un champ `linked_group` sur la table `workshops`. Les workshops partageant le même `linked_group` (un UUID) sont vendus ensemble comme une seule réservation.

## Modifications

### 1. Base de données

Ajouter une colonne `linked_group` (UUID, nullable) à la table `workshops`. Les workshops avec le même `linked_group` non-null forment un lot indissociable.

### 2. Admin — Éditeur d'activités (Activites.tsx)

- Ajouter un type d'événement **"Multi-sessions"** dans le menu Ajouter (en plus de Récurrent et Ponctuel).
- Un événement multi-sessions permet de sélectionner **plusieurs dates** (via un calendrier multi-select, similaire au mode "personnalisé" existant) mais avec une différence clé : toutes les dates partagent le même prix, les mêmes places, et sont liées.
- Dans le `EventSlot`, ajouter `linkedDates: string[]` et `_linkedGroup?: string`.
- Au save, tous les workshops d'un groupe multi-sessions reçoivent le même UUID `linked_group`.
- Affichage dans la liste : un seul bloc avec toutes les dates affichées (ex: "14 mars & 21 mars").

### 3. Visiteur — Cartes d'activités (ActivitiesView.tsx)

- Lors du groupement des workshops par nom, regrouper aussi par `linked_group`.
- Afficher les dates liées ensemble : "Les samedis 14 & 21 mars 2026" au lieu de deux lignes séparées.
- Le bouton "Réserver" envoie toutes les dates du groupe dans le tunnel de réservation.

### 4. Visiteur — FrequencyDialog

- Les dates liées apparaissent groupées : afficher "14 & 21 mars" sur une seule ligne plutôt que deux lignes indépendantes.
- Afficher le nombre de places restantes du groupe (= min des places restantes des workshops liés).

### 5. Tunnel de réservation (Reserver.tsx / BookingSummary)

- Quand l'utilisateur réserve un groupe lié, le récapitulatif affiche toutes les dates du lot.
- La réservation crée une entrée pour chaque date du groupe, toutes liées par le même `linked_group`.

## Détails techniques

```text
workshops table:
  + linked_group UUID nullable

EventSlot interface:
  + linkedDates: string[]     // dates sélectionnées pour ce lot
  + _linkedGroup?: string     // UUID du groupe

Flux save:
  type "multi-sessions" → générer 1 UUID linked_group
  → insérer N workshops avec ce linked_group

Flux visiteur:
  grouper workshops par (name, linked_group)
  → afficher dates jointes "14 & 21 mars"
  → réserver = réserver toutes les dates du groupe
```

### Fichiers impactés
- `supabase/migrations/` — nouvelle migration (ajout `linked_group`)
- `src/pages/admin/Activites.tsx` — nouveau type multi-sessions dans l'éditeur
- `src/components/ActivitiesView.tsx` — groupement et affichage des dates liées
- `src/components/FrequencyDialog.tsx` — affichage groupé
- `src/pages/Reserver.tsx` — prise en charge du lot dans le tunnel
- `src/hooks/useActivitiesData.ts` — ajout `linked_group` au type Workshop

