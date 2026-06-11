# Plan — 7 corrections cohérence & UX

## 1) Admin Boutons : modifications sans effet
Cause probable : pas de `useDemo`/auth synchronisée + pas de retour visuel + cache local non rafraichi sur la home.

Actions :
- `admin/Boutons.tsx` : après `update`, recharger la liste (`load()`), conserver le toast existant, ajouter un état `dirty` pour activer le bouton Enregistrer uniquement si changement.
- `ActivityFilterBar.tsx` : exposer un canal de refresh — utiliser une `queryKey` react-query (`["home_buttons"]`) au lieu d'un `useEffect`+state. Idem dans la page admin → `invalidateQueries(["home_buttons"])` après sauvegarde, pour que la home se mette à jour sans rechargement.
- Vérifier que les RLS autorisent bien l'écriture (déjà OK : policy `authenticated`). Si l'utilisateur admin de démo n'est pas authentifié Supabase, ajouter une policy lecture/écriture publique sur `home_buttons` (mode démo).

## 2) Clic sur événement ponctuel en accueil
Aujourd'hui `handleProgrammeEventClick` scrolle vers une carte. Demande : ouvrir la fiche activité.

Actions :
- Dans `ActivitiesView.tsx`, remplacer le scroll par : `setDescriptionWs(workshop)` (ou `setDescriptionCourse`) selon le type, ce qui ouvre l'`ActivityDetailPanel` directement.

## 3) Espace client (`MonEspace.tsx`)
Refonte demandée :
- Supprimer la rangée de raccourcis du haut (Réserver / Acheter carte / Bon cadeau).
- Bloc "Bonjour {Prénom}" : intégrer un bouton **Mon profil** + un bouton **Voir mes réservations** (scroll vers l'onglet Réservations).
- Conserver : 3 cartes synthèse, onglets, activité récente, bandeau Contacter Élodie.
- Nettoyer les sections redondantes / espace vide.

## 4) Page admin Clients : afficher les comptes créés en démo
Aujourd'hui la page lit `profiles` (Supabase). Les comptes démo vivent dans `DemoContext` (localStorage).

Actions :
- `admin/Clients.tsx` : fusionner la liste Supabase avec `useDemoContext().userCreatedProfiles` (badge "Démo" sur ces lignes). Tri par date de création, dédoublonnage par id/prénom.

## 5) Popup post-création de compte invisible
La popup existe dans `pages/Register.tsx`, mais le tunnel `/reserver` utilise `SignupBlock.tsx` qui ne l'affiche pas.

Actions :
- Ajouter le même Dialog (Continuer la réservation / Découvrir l'espace client) dans le flux du tunnel : après `createTempProfile` côté `Reserver.tsx`, afficher `<PostSignupChoice />` (composant partagé extrait depuis Register).
- Extraire le Dialog dans `src/components/PostSignupChoice.tsx` et le réutiliser dans Register + Reserver.

## 6) Masquer "Se connecter ou créer un compte" si connecté
`ActivityDetailPanel` teste `supabase.auth.getUser()` mais la démo utilise `DemoContext`. Donc toujours `false`.

Action :
- Remplacer la détection par `useDemoContext()` : `isLoggedIn = !!currentProfile`. Le CTA "Se connecter" disparaît dès qu'un compte est actif.

## 7) Refonte processus de réservation — Méta-bloc inline
Aujourd'hui : clic Réserver → navigation vers `/reserver` (changement d'écran).

Proposition : sous les boutons CTA de l'`ActivityDetailPanel`, dérouler un **méta-bloc de réservation inline** (sans navigation), avec 4 sections :

```text
[ Description / 4 blocs / Planning … ]
─────────────────────────────────────
 ▼  Réservation (déroulant)
 1. Choisissez votre date     → liste des prochaines dates (récurrent ou ponctuel)
 2. Participants              → +/- et ajout d'invités
 3. Tarif                     → "X cartes soit X €" (yoga) / "X €" (poterie)
 4. Mode de paiement
   • Yoga :   [Commander] [Utiliser un bon cadeau] [Découvrir les formules]
   • Poterie :[Commander] [Utiliser un bon cadeau]
─────────────────────────────────────
```

Actions :
- Nouveau composant `src/components/booking/InlineBookingFlow.tsx` réutilisant les briques existantes (`AddParticipant`, `PurchaseOptions`, `BookingSummary`, `FormulaInfoModal`, `MockStripeModal`).
- Dans `ActivityDetailPanel`, le bouton **Réserver** déplie le bloc (au lieu de `navigate('/reserver')`).
- Si l'utilisateur n'est pas connecté, l'étape 4 affiche d'abord `LoginBlock`/`SignupBlock` inline (mêmes composants que le tunnel actuel).
- À la confirmation : appel des mêmes mutations qu'aujourd'hui + `ConfirmationPopup`.
- La route `/reserver` est conservée (legacy / lien direct) mais n'est plus la cible par défaut depuis l'accueil.

## Détails techniques

- Aucun changement de schéma DB.
- Nouveaux fichiers : `src/components/PostSignupChoice.tsx`, `src/components/booking/InlineBookingFlow.tsx`.
- Fichiers modifiés : `ActivityFilterBar.tsx`, `admin/Boutons.tsx`, `ActivitiesView.tsx`, `MonEspace.tsx`, `admin/Clients.tsx`, `Reserver.tsx`, `ActivityDetailPanel.tsx`, `pages/Register.tsx`.
- Réutilisation maximale des composants existants pour le booking inline (pas de duplication logique).
