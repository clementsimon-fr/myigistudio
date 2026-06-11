## Objectif

Transformer le flux de réservation actuel (`InlineBookingFlow` intégré sous la fiche) en une **sheet de Réservation semi-transparente glissable** qui s'affiche par-dessus la fiche activité. L'utilisateur peut la faire glisser vers le bas à tout moment pour relire la fiche.

## 1. Sheet "Réservation" glissable

- Remplace l'affichage inline actuel par une **Sheet Radix** (ou drawer) ancrée en bas, par-dessus `ActivityDetailPanel`.
- Comportement :
  - Ouverture au clic sur "Réserver" → sheet à 90% de hauteur.
  - Drag handle visible en haut (barre horizontale).
  - Glissable verticalement : 3 snap points → plein écran / mi-hauteur (peek) / fermée.
  - Fond semi-transparent (backdrop blur léger, pas d'overlay opaque) pour laisser deviner la fiche dessous.
  - Bouton "×" pour fermer + chevron pour réduire en peek.

## 2. Étapes dans la sheet

### Étape 1 — Date
- Sélecteur horizontal des prochaines dates (déjà existant).

### Étape 2 — Participants
- Compteur +/− identique à aujourd'hui.
- Pour chaque participant une **ligne** :
  - **Participant 1** : si utilisateur connecté → libellé "Moi — {prénom}" (non éditable). Sinon → bouton "Se connecter" + champ "Prénom" en fallback.
  - **Participants 2..n** : champ texte "Prénom" obligatoire.

### Étape 3 — Tarif / Moyens de paiement
- **Pour Yoga** : libellé "Choisissez votre tarif" + bouton **"Choisir"** ouvrant le popup `FormulasModal` (voir §3).
- **Pour Poterie** : même bouton "Choisir" ouvrant un popup simplifié (bon cadeau OU paiement direct).
- Sous le bouton, affichage des **attributions par participant** :
  ```text
  Marie  → Carte Yoga x10 (formule)
  Léa    → Bon cadeau #ABCD
  Paul   → Carte à l'unité (17 €)
  ```
  Chaque ligne a un bouton "Modifier" qui rouvre le popup positionné sur ce participant.
- L'étape n'est validée que si **chaque participant a un moyen de paiement attribué**.

### Étape 4 — Conditions
- Checkbox "J'accepte les conditions" (lien vers page conditions).
- Bouton "Continuer" désactivé tant que non cochée.

### Étape 5 — Récapitulatif + Paiement
- Récap : activité, date/heure, lignes participants avec leur moyen de paiement, total à régler en € (somme des cartes unitaires + différentiel formules à acheter), 0 € si tout couvert par cartes existantes/bons.
- Bouton **"Confirmer le paiement"** → mock Stripe si montant > 0, sinon confirmation directe.

## 3. Popup "Formules cartes yoga" (refondu)

Ordre vertical des options dans le popup :

1. **Bloc "Bon cadeau"** (nouveau, tout en haut) — champ code + bouton "Appliquer".
2. **Bloc "Carte yoga à l'unité"** — prix = `unitPrice × nbParticipantsNonAttribués` (ex. 51 € pour 3 inscrits restants). Bouton "Utiliser" → attribue automatiquement aux participants restants.
3. **Formules multi-cartes** (10 cartes, 20 cartes…) avec badge économie.

### Sélection d'une formule
- Au clic sur une formule, si non connecté → message "Vous devez créer un compte ou vous connecter" + 2 boutons (Se connecter / Créer un compte). À la fin du flux d'auth, l'utilisateur revient sur la sheet de réservation **dans l'état où il l'a laissée** (état persisté en `sessionStorage`).
- Si connecté → ouverture d'un mini-sélecteur **"Qui utilise cette formule ?"** listant les participants non encore attribués. L'utilisateur coche un ou plusieurs participants.
- Une formule peut couvrir plusieurs participants (consomme N cartes du solde).

### Bon cadeau
- Idem yoga + poterie. Une fois validé → attribué à un participant choisi. Plusieurs bons cadeaux possibles (un par participant max).

## 4. Persistance d'état pour auth round-trip

- Sauvegarder dans `sessionStorage` (clé `pendingBooking`) : `{courseId|workshopId, date, participants[], attributions[]}` avant redirection auth.
- Au montage de la page d'accueil, si `pendingBooking` présent ET user connecté → restaurer la sheet et réouvrir l'étape "Tarif".

## 5. Fichiers concernés

**Nouveaux**
- `src/components/booking/BookingSheet.tsx` — sheet glissable + steppers internes.
- `src/components/booking/ParticipantsStep.tsx` — saisie prénoms + "Moi".
- `src/components/booking/PaymentAttributionStep.tsx` — bouton "Choisir" + table d'attributions.
- `src/components/booking/FormulasPickerModal.tsx` — popup refondu (bon cadeau + unité + formules + sélecteur participants).
- `src/components/booking/BookingRecap.tsx` — récap final.
- `src/hooks/usePendingBooking.ts` — sauvegarde / restauration sessionStorage.

**Modifiés**
- `src/components/ActivityDetailPanel.tsx` — retirer `InlineBookingFlow` inline, ouvrir `BookingSheet` au clic "Réserver". La sheet est positionnée par-dessus le panel (`z-60`).
- `src/components/booking/FormulaInfoModal.tsx` — remplacé / réutilisé par `FormulasPickerModal` (compat ascendante conservée).
- `src/pages/Reserver.tsx` — déprécié (le `/reserver` route reste mais redirige vers la home avec sheet ouverte si possible).

**Pas de migration DB** — toutes les tables nécessaires existent déjà (`pricing_cards`, `gift_vouchers`, `client_cards`, `reservations`).

## 6. Points techniques

- Sheet glissable : utiliser `vaul` (déjà dans l'écosystème shadcn `drawer.tsx`) — supporte snap points + drag natif.
- Fond semi-transparent : `bg-background/85 backdrop-blur-sm` sur le content, **pas d'overlay opaque** (override `DrawerOverlay` avec `bg-transparent`).
- Validation step-by-step : `currentStep` state local + désactivation du bouton "Continuer" si conditions non remplies.
- L'attribution est un tableau : `[{ participantIndex, method: 'unit'|'formula'|'voucher'|'existing_cards', payload }]`.

## Non-inclus / à confirmer plus tard

- Le mode "carte yoga existante du compte" (solde > 0) sera proposé en haut du popup si l'utilisateur connecté a déjà des cartes — confirmera l'UX exacte après première itération.
