

## Plan

### 1. Page Activités : simplifier les cartes (présentation uniquement)

**Yoga cards** : Retirer les horaires (schedules), le badge places, le nombre de participants. Garder : image, nom, description, intervenant, bouton Description, bouton Réserver.
**Workshop cards (Poterie, Ateliers)** : Retirer date, horaires, places, prix des cartes. Garder : image, nom, description, intervenant, bouton Description, bouton Réserver.

Les deux types de cartes auront la même structure uniforme : image + titre + description courte + intervenant + 2 boutons.

**Bouton "Réserver"** : au lieu de `/reserver?type=...&id=...`, il redirigera vers `/calendrier?filter=yoga` (ou `poterie`, `bien-etre`). La page Planning appliquera le filtre automatiquement via un query param.

### 2. Bouton Description pour Yoga

Déjà présent dans le code (lignes 185-188). Confirmé fonctionnel. Pas de changement nécessaire.

### 3. Page Planning : réservation directe sans re-sélection de date

Quand le client clique "Réserver" sur un bloc du planning, il connaît déjà la date et le créneau. Au lieu de rediriger vers `/reserver` (qui re-demande une date), on passera la date et le schedule_id dans les query params : `/reserver?type=course&id=X&scheduleId=Y&date=2026-03-14`.

Dans `Reserver.tsx` : si `date` et `scheduleId` sont fournis dans les params, pré-sélectionner la date et le créneau, et sauter directement à l'étape de saisie des informations (participants + confirmation).

### 4. Filtres sticky qui ne s'affichent pas au scroll (bug visible sur screenshot)

Le screenshot montre que les filtres sont coupés en haut lors du scroll — seuls "Poterie" et "Bien-être" sont visibles, "Toutes" et "Yoga" sont masqués par la navbar.

**Cause** : `ActivityFilterBar` a `sticky top-0` mais la Navbar est aussi en haut. Il faut ajuster le `top` pour tenir compte de la hauteur de la navbar.

**Fix** : Changer `top-0` en `top-[var(--navbar-height)]` ou une valeur fixe cohérente (ex. `top-16`), et s'assurer que la navbar a un z-index inférieur ou que le filter bar passe en dessous de la navbar. Alternativement, intégrer les filtres dans la navbar sticky elle-même sur mobile.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/Activites.tsx` | Simplifier les cartes (retirer horaires, places, prix). Changer les liens "Réserver" vers `/calendrier?filter=...` |
| `src/pages/Calendrier.tsx` | Lire le query param `filter` pour pré-appliquer le filtre. Passer date+scheduleId dans handleBook |
| `src/pages/Reserver.tsx` | Lire `date` et `scheduleId` des params, pré-sélectionner et sauter l'étape calendrier |
| `src/components/ActivityFilterBar.tsx` | Fixer le positionnement sticky (top offset pour la navbar) |

