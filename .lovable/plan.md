

# Plan: Refonte du flow de réservation

## Vue d'ensemble

Réécriture complète de `src/pages/Reserver.tsx` (~1231 lignes) pour passer d'un flow linéaire rigide à un flow adaptatif en 5 étapes avec logique conditionnelle basée sur 3 états utilisateur : `guest`, `logged_user_no_cards`, `logged_user_with_cards`.

## Architecture des étapes

```text
Étape 1: Sélection créneau (existant, inchangé - depuis Découvrir/Planning)
    ↓
Étape 2: Résumé + Choix compte (Se connecter | Créer compte | Sans compte)
    ↓
Étape 3: Options d'achat dynamiques (adapté selon état utilisateur + catégorie)
    ↓
Étape 4: Paiement (résumé final + Stripe simulé)
    ↓
Étape 5: Confirmation (popup + redirection conditionnelle)
```

## Changements par fichier

### `src/pages/Reserver.tsx` — Réécriture complète

**Step type** passe de `"auth" | "register" | "registering" | "login" | "offers" | "confirm"` à `"summary" | "login" | "register" | "registering" | "guest_form" | "purchase_options" | "payment" | "confirmed"`.

**Logique d'état utilisateur** :
- `guest` : pas de `currentProfile`
- `logged_user_with_cards` : `currentProfile` + `credits > 0` + activité yoga
- `logged_user_no_cards` : `currentProfile` + `credits === 0` + activité yoga
- Pour poterie/ateliers : pas de système de cartes, uniquement achat unitaire ou bon cadeau

**Étape 2 — `summary`** (nouvelle étape de départ) :
- Bloc 1 : Résumé (activité, date, heure, durée, lieu, prix unitaire)
- Bloc 2 : 3 boutons — Se connecter / Créer un compte / Continuer sans compte
- Si déjà connecté → skip automatique vers étape 3

**Étape 2 — `register`** (création compte) :
- Champs : prénom (actif), nom + email + téléphone + mot de passe (grisés pour la démo)
- Bouton Google grisé
- Après validation → `registering` (2s loading) → retour au flow avec utilisateur connecté

**Étape 2 — `login`** :
- Sélecteur de comptes clients (exclut admin/fournisseur, comme actuellement)
- Bouton Google grisé
- Après sélection → retour au flow

**Étape 2 — `guest_form`** :
- Champs : prénom (actif), nom + email + téléphone (grisés)
- L'utilisateur reste `guest`

**Étape 3 — `purchase_options`** (le coeur de la refonte) :

| Contexte | Options affichées |
|----------|-------------------|
| **Yoga — connecté avec cartes** | "Cartes yoga disponibles : X" + bouton principal "Réserver avec 1 carte" + texte "1 carte sera déduite après confirmation." + "Acheter des cartes yoga" + "Utiliser un bon cadeau" |
| **Yoga — connecté sans cartes** | "Cartes yoga disponibles : 0" + "Acheter des cartes yoga" + "Utiliser un bon cadeau" |
| **Yoga — guest** | "Acheter un cours à l'unité" + "Utiliser un bon cadeau" + "Voir les formules" (ouvre détail + message "Vous devez créer un compte pour acheter ou utiliser une formule de cartes." + boutons Créer un compte / Continuer sans formule) |
| **Poterie/Ateliers — tous** | "Acheter à l'unité" + "Utiliser un bon cadeau" (jamais de cartes) |

- Pour l'habitué connecté avec cartes : **fast path** → Réserver avec 1 carte → Étape 4 (paiement skip) → Confirmation directe

**Étape 4 — `payment`** :
- Résumé final (activité, date, heure, tarif, mode choisi : "1 carte yoga utilisée" / "cours à l'unité" / "formule 5 cartes" / "bon cadeau")
- Bouton "Payer" → MockStripeModal (sauf si paiement par carte yoga → confirmation directe)

**Étape 5 — `confirmed`** :
- Popup de confirmation "Réservation confirmée"
- Bouton "Voir ma réservation"
- Redirections : nouveau compte → `/mon-espace?welcome=1`, connecté → `/mon-espace`, guest → simple confirmation sur place

**Renommages UX** :
- "Acheter une formule de cartes" → "Acheter des cartes yoga"
- Texte de réassurance sous le bouton principal pour les habitués : "1 carte sera déduite après confirmation."

### `src/pages/Discover.tsx` — Aucun changement structurel

L'étape 1 (sélection créneau) reste dans Discover/Planning, la navigation vers `/reserver` est inchangée.

### Suppression de `/reserver` sans paramètres

La page "Réserver une activité — Choisissez une activité depuis notre planning..." est déjà supprimée (cf. plan précédent). Si l'utilisateur arrive sur `/reserver` sans params, redirection vers `/?view=planning`.

### `src/contexts/DemoContext.tsx` — Ajout d'un état `guestName`

Ajouter un champ optionnel `guestName` dans le contexte pour gérer le flow "sans compte" (prénom saisi mais pas de profil créé).

## Composants UI à extraire (pour lisibilité)

Extraire des sous-composants depuis `Reserver.tsx` dans un dossier `src/components/booking/` :
- `BookingSummary.tsx` — bloc résumé de la réservation
- `AccountChoice.tsx` — les 3 boutons de choix de compte
- `SignupBlock.tsx` — formulaire création avec champs grisés
- `LoginBlock.tsx` — sélecteur de comptes + Google grisé
- `GuestForm.tsx` — formulaire guest avec champs grisés
- `PurchaseOptions.tsx` — logique conditionnelle des options d'achat
- `FormulaInfoModal.tsx` — popup "Voir les formules" pour guests
- `PaymentSummary.tsx` — résumé final avant paiement
- `ConfirmationPopup.tsx` — popup de confirmation

Cela réduit `Reserver.tsx` de ~1231 lignes à ~300 lignes de coordination.

## Résumé des gains

- **Moins d'écrans** : 5 étapes claires vs un flow ambigu
- **Logique conditionnelle** : le contenu s'adapte automatiquement
- **Fast path habitué** : Créneau → Réserver avec carte → Confirmé (3 clics)
- **Séparation yoga vs poterie/ateliers** : plus de confusion sur les cartes
- **Meilleure conversion formules** : les guests voient les formules mais doivent créer un compte

