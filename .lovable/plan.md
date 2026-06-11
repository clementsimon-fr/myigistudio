# Plan — Améliorations bloc Activité & Réservation

## 1. Méta-bloc « Formules Cartes Yoga » repliable
Dans `ActivityDetailPanel.tsx`, transformer le contenu du bloc Formules en pattern repliable :
- Afficher uniquement la phrase descriptive (« Vous pouvez acheter un cours à l'unité ou plusieurs cartes… »).
- Sous le texte, un bouton avec chevron (« Voir les formules ▾ ») qui déplie la liste complète des `YogaFormulasBlock` (cartes unité + multi).
- Repli par défaut, animation `Collapsible` (déjà dispo : `src/components/ui/collapsible.tsx`).

Petit ajustement dans `YogaFormulasBlock` : extraire ou rendre le `showHeader=false` pour ne montrer que la liste — déjà supporté.

## 2. Méta-bloc « En détail » — ajout du tile « Durée »
Dans la grille (`grid-cols-2`) de `ActivityDetailPanel.tsx`, ajouter une 5e tuile :
- Icône `Clock`, label « Durée ».
- Valeur calculée depuis `selected schedule/workshop time → end_time` (ex. « 1h15 ») ou repli sur `duration` si présent dans le course.
- Passer la grille à `grid-cols-2` avec une 5e cellule en pleine largeur (`col-span-2`) **ou** passer en `grid-cols-2` avec 5 items où le dernier prend `col-span-2`.

## 3. Étape « Qui réserve ? » + nouvelle étape Participants
Refonte de l'étape 2 dans `BookingSheet.tsx` :
- Renommer le titre/label stepper de « Participants » → « Qui réserve ? ».
- N'afficher que le premier participant (le réservant) à cette étape.
- Bouton « Continuer » désactivé tant que **l'une** des trois actions n'est pas validée : connecté, compte créé (`currentProfile` set), ou `guestMode === true`.
- Insérer une **nouvelle étape 3** « Participants » :
  - Compteur +/- et champs prénoms des participants additionnels (extraits de l'écran actuel).
  - Title : « Ajouter des participants ».
- Décaler les étapes suivantes : Tarif → 4, Conditions → 5, Paiement → 6. Mettre à jour `STEPS`, `canNext`, le footer (`step < 6`), les conditions de skip et la stepper bar.

## 4. Popup « Choisir votre mode de paiement » — retirer le séparateur
Dans `FormulasPickerModal` (`BookingSheet.tsx`), supprimer le bloc `<div className="flex items-center gap-3">…ou choisir une formule…</div>` situé **avant** la liste des formules multi (et également celui « ou choisir un cours à l'unité » si demandé — à confirmer si seul celui « formule » doit partir). Selon la demande : retirer celui sous lequel apparaît « Carte Yoga à l'unité » n'est PAS demandé — seul celui « ou choisir une formule » doit disparaître.

## 5. Bouton « Retour » navigateur fonctionnel
Synchroniser les étapes du `BookingSheet` avec l'historique du navigateur :
- À chaque `setStep(n)`, faire `history.pushState({ bookingStep: n }, "")`.
- Écouter `popstate` : si `event.state?.bookingStep` existe, revenir à cette étape (sans push). Sinon (ex. retour avant ouverture), fermer le panel.
- Push initial à l'ouverture du panel/sheet, cleanup à la fermeture.

Couvre aussi le retour depuis le panel d'activité (déjà géré par `onClose`, à confirmer).

## 6. Audit du bug « 17 € au lieu de la formule »
Cas reproduit : utilisateur non connecté → clic sur une formule → popup « Compte requis » → crée un compte → revient au picker, mais l'attribution finale est « unité 17 € ».

Diagnostic prévu :
- `handleSignupSubmit` rouvre `pickerOpen` mais ne **ré-attribue pas** la formule (correct — pas d'auto-pick).
- Pourtant l'utilisateur voit 17 €. Hypothèse : à la réouverture, `pickerForParticipant` peut être `null` et `remainingIdxs` part sur unit par défaut, ou le `pendingFormula` n'est pas reproposé visuellement → l'utilisateur clique « Continuer » sans repicker et tombe sur unité auto.
- Plan d'action :
  1. Supprimer toute logique implicite : après signup, **rouvrir le picker en mode "choose"** sans pré-sélection ; afficher un bandeau d'info « Vous étiez en train de choisir la formule {pendingFormula.name} — sélectionnez-la pour confirmer ».
  2. Ne **jamais** auto-appliquer `pendingFormula` ; l'utilisateur doit recliquer explicitement.
  3. Vérifier qu'aucune attribution « unit » n'est posée par défaut au passage à l'étape Tarif (l'attribution doit rester `null` jusqu'au choix utilisateur — déjà le cas, à valider).
  4. Vérifier `setParticipantCount` / re-init après signup : l'effet `useEffect([open, currentProfile?.id])` reset `participants` et `attributions` → **c'est probablement la cause**. Le signup change `currentProfile.id`, ce qui re-déclenche l'init et **efface l'attribution** + remet à zéro. Correctif : ne ré-init que sur ouverture (`open` flip), pas sur changement de profil ; mettre à jour uniquement le participant 0 (nom + isMe) lors d'un changement de profil intra-session.

## Détails techniques

Fichiers modifiés :
- `src/components/ActivityDetailPanel.tsx` — bloc Formules repliable, tuile Durée.
- `src/components/booking/BookingSheet.tsx` — split étape Qui réserve / Participants, gating, suppression divider, history API, fix init.
- (éventuel) `src/components/YogaFormulasBlock.tsx` — exposer juste la liste sans le header descriptif.

Aucune migration DB. Aucun changement de logique tarifaire au-delà du fix d'init.

## Validation
- Parcourir manuellement le tunnel : non-connecté → formule → signup → vérifier que la formule reste à choisir et que le total reflète bien le prix de la formule.
- Tester le bouton retour navigateur à chaque étape (desktop + mobile).
- Vérifier que « Continuer » de l'étape 2 reste désactivé tant qu'aucune option d'identité n'est choisie.
