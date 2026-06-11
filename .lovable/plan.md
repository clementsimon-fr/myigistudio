# Plan — Ajustements UX (6 points)

## 1. Meta-blocs sur l'accueil
Sur `/` (Index) et `/discover`, encadrer le contenu en **deux sections globales en haut de page**, au-dessus de la liste actuelle :
- **🔁 Événements récurrents** → contient le calendrier mensuel (cours hebdo Yoga/Pilates/Poterie)
- **📅 Événements ponctuels** → contient les cartes de dates d'ateliers/stages

Conteneurs visuels : titre + sous-titre + bordure légère + fond `muted/30`. Pas de changement de logique, seulement un wrapper qui groupe l'existant.

## 2. Refonte densité desktop (option b)
Pas de zoom CSS. Au lieu de ça, sur `≥ lg` :
- Réduire paddings sections : `py-16` → `py-10`, `py-12` → `py-8`
- Réduire tailles titres : `text-5xl` → `text-4xl`, `text-4xl` → `text-3xl`
- Réduire gaps grilles : `gap-8` → `gap-6`
- Cartes activités : réduire image height (`h-64` → `h-52`) et padding interne
- Navbar : `h-20` → `h-16` desktop
- Container : passer `max-w-7xl` → `max-w-6xl` pour densifier la lecture

Cible : `src/index.css` (overrides utilitaires) + `Navbar.tsx`, `PricingSection.tsx`, `TeamSection.tsx`, `ActivitiesView.tsx`, `Discover.tsx`, page Index.

## 3. Mobile accueil
- Boutons Poterie / Yoga **côte à côte** : `grid grid-cols-2 gap-3` au lieu de `flex-col`
- Bande rouge événement : `whitespace-nowrap overflow-hidden text-ellipsis` + sur mobile, masquer le texte annexe "— Cliquez ici pour en savoir plus" (`hidden sm:inline`), réduire taille police (`text-xs` mobile)

## 4. Clic sur créneau → bonne carte
Dans la vue accueil/Discover, quand l'utilisateur clique un créneau dans le bloc sous le calendrier, l'app doit :
- Identifier l'`activityId` du créneau
- Scroller jusqu'à la carte d'activité correspondante (`document.getElementById('activity-{id}')`)
- Highlight visuel temporaire (ring 2s)

Ajouter `id="activity-{id}"` sur chaque carte dans `ActivitiesView`, et brancher le `onClick` du créneau pour scroll smooth.

## 5. Tunnel invité → création compte → retour propre
**Persistance du contexte** :
- Quand un invité clique "Créer un compte" depuis le tunnel, persister `{ activityType, activityId, date, time }` dans `localStorage` sous la clé `pendingBooking`.
- Au retour sur `/reserver` (après login/register), repeupler l'état et **sauter** aux étapes activité+date déjà choisies.

**Affichage tunnel connecté (étape paiement)** :
- Blocs séquentiels : **Votre activité** / **Votre date** / **Participants** (avec mention "connecté en tant que Prénom.X") / **Tarif**
- Section **Tarif** :
  - Ligne principale : "1 carte (X €)" — où X = prix unitaire de la séance
  - Bouton primaire : **"Acheter une carte ou une formule"**
  - Bouton secondaire : **"J'ai un bon cadeau"**
- Au clic "Acheter une carte" → modal/section formule (déjà existante : `PurchaseOptions`)
- Après choix formule → nouvelle section **Commande** affichée :
  - Votre formule (nom + nb cours)
  - Carte utilisée : 1
  - Cartes restantes après réservation
  - **Prix total = prix de la formule** (pas la séance unitaire)

Cible : `Reserver.tsx`, `PaymentSummary.tsx`, ajout d'un nouveau composant `OrderSummary.tsx`.

## 6. Dupliquer une activité (admin)
Sur `/admin/activites`, ajouter un bouton **"Dupliquer"** (icône Copy) sur chaque carte activité, à côté de "Modifier" / "Supprimer".

Action : insert dans `courses` (ou `workshops` selon le type) avec :
- `name` = `{original}.name + " (copie)"`
- Tous les champs (description, prix, intervenant, inclusions, images, default_*) copiés
- Sessions planifiées **non copiées** (planning vide)
- `id` nouveau auto-généré

Toast de confirmation + ouverture du drawer sur la copie pour édition immédiate.

## Détails techniques

- Pas de migration DB.
- Composants nouveaux : `OrderSummary.tsx` (point 5).
- Fichiers modifiés : `Index.tsx`, `Discover.tsx`, `ActivitiesView.tsx`, `Navbar.tsx`, `PricingSection.tsx`, `TeamSection.tsx`, `Reserver.tsx`, `PaymentSummary.tsx`, `LoginBlock.tsx`/`SignupBlock.tsx` (pour persister `pendingBooking`), `Activites.tsx` (admin, bouton duplicate), `index.css` (densité desktop).
- `pendingBooking` en localStorage expire après 1h.

## Ordre d'exécution suggéré
1. Point 6 (dupliquer) — isolé, rapide
2. Point 3 (mobile accueil) — visuel rapide
3. Point 1 (meta-blocs) — wrapper visuel
4. Point 4 (scroll vers carte) — scroll + ids
5. Point 2 (densité desktop) — passe globale
6. Point 5 (tunnel invité→compte) — le plus gros, en dernier
