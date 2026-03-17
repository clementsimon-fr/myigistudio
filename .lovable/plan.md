

# Plan: Améliorations UX du flow de réservation Yoga

## 1. BookingSummary — "ou 1 carte" avec bulle info (1.1)

**`src/components/booking/BookingSummary.tsx`**: A cote du "Prix unitaire X €", ajouter un texte "ou 1 carte" avec une icône `Info` qui ouvre un `Popover` affichant le contenu des formules (meme contenu que `FormulaInfoModal` mais en version inline/popover). Passer `pricingCards` et `isYoga` en props.

## 2. PaymentSummary — Afficher le mode choisi + checkbox rouge (1.2 & 1.3)

**`src/components/booking/PaymentSummary.tsx`**: 
- Ajouter un bloc visuel au-dessus des conditions montrant le mode de réservation choisi (ex: "Cours à l'unité", "Bon cadeau")
- Si l'utilisateur clique "Payer" sans avoir coché les conditions, la checkbox et son label passent en rouge (`text-destructive`, `border-destructive`)
- Ajouter un state `showConditionError` qui se set à true au clic sur Payer si non coché, et se reset quand on coche

## 3. FormulaInfoModal — Améliorer le contenu (1.3)

**`src/components/booking/FormulaInfoModal.tsx`**:
- Ajouter un court paragraphe en haut expliquant le principe des formules : "Les cartes yoga vous permettent de réserver vos cours à un tarif avantageux. Achetez une carte, et utilisez vos cours quand vous le souhaitez."
- Mettre le nombre de cours en plus gros / plus visible (badge ou texte large) au lieu du petit texte actuel

## 4. ConfirmationPopup — Bouton "Quitter" pour guests (1.4)

**`src/components/booking/ConfirmationPopup.tsx`**: Pour les guests, remplacer le simple texte par un bouton "Retour à l'accueil" qui navigue vers `/`. Ajouter `onClose` en prop.

## 5. LoginBlock — UX réaliste avec champs grisés + mode démo (1.5)

**`src/components/booking/LoginBlock.tsx`**: Refonte du bloc login :
- Champs Email + Mot de passe grisés (comme SignupBlock)
- Bouton "Connexion Google" grisé avec logo Google (svg inline)
- Séparateur "── OU DÉMO ──"
- En dessous, la liste déroulante des comptes clients existants (Marion, Sophie, etc.) avec le titre "Mode démo : choisir un compte"

## 6. PaymentSummary — Détail formule yoga amélioré (1.6)

**`src/components/booking/PaymentSummary.tsx`** + **`src/pages/Reserver.tsx`**: 
- Passer des props supplémentaires : `cardName`, `cardSessions`, `existingCredits`, `activityName`
- Quand mode = achat formule, afficher :
  - "Achat : Formule Découverte" (pas "Achat Découverte")
  - "Montant : 50 €"
  - "Inclut : 3 cours"
  - "Réservation [activité] : consomme 1 cours"
  - "Solde restant après réservation : 2 cours"
- Si l'utilisateur a déjà des crédits, afficher une bulle info expliquant le calcul : "achat de X cours + Y cours disponibles - 1 cours pour réservation = Z cours disponibles"
- Dans `Reserver.tsx`, passer `pendingCard` info et `currentProfile.credits` au composant

## 7. Navbar — Bouton connexion = icône seule (1.7)

**`src/components/layout/Navbar.tsx`**: Pour les visiteurs non connectés, remplacer `<Button>Connexion</Button>` par un bouton icône seul (`User` icon, `size="icon"`, `variant="ghost"`).

## 8. ActivityFilterBar — Retirer "Aujourd'hui" + déplacer Planning type (1.8)

**`src/components/ActivityFilterBar.tsx`**: 
- Supprimer le bouton/onglet "Planning" (planning-type) de la barre de navigation principale. Les 2 onglets restants : "Découvrir" et "Réserver".

**`src/components/ActivitiesView.tsx`**: Le bouton planning type reste dans les cards d'activités (déjà le cas avec l'icône `CalendarRange`).

**`src/pages/Discover.tsx`**: 
- Supprimer la gestion de `view === "planning-type"` 
- Le view mode n'a plus que 2 valeurs : `"activites"` | `"planning"`
- La page doit charger par défaut sur "activites" (Découvrir) — qui est le catalogue des activités (= "Description" dans le vocabulaire du testeur)

**`src/components/PlanningView.tsx`**: Si un label "Aujourd'hui" existe dans le calendrier/planning, le retirer pour éviter la confusion.

## Fichiers modifiés

| Fichier | Changements |
|---------|------------|
| `BookingSummary.tsx` | Ajout "ou 1 carte" + popover formules |
| `PaymentSummary.tsx` | Mode choisi visible, checkbox rouge, détail formule avec solde |
| `FormulaInfoModal.tsx` | Paragraphe intro + nombre de cours plus visible |
| `ConfirmationPopup.tsx` | Bouton "Retour à l'accueil" pour guests |
| `LoginBlock.tsx` | Refonte : champs grisés + Google grisé + mode démo séparé |
| `Navbar.tsx` | Bouton connexion = icône seule |
| `ActivityFilterBar.tsx` | Retirer onglet Planning type |
| `Discover.tsx` | Retirer view planning-type, garder 2 vues |
| `Reserver.tsx` | Passer props supplémentaires à PaymentSummary |
| `PlanningView.tsx` | Retirer label "Aujourd'hui" si présent |

