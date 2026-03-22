

## Plan de correction — 12 points

### Fichiers impactés
- `src/components/booking/PurchaseOptions.tsx`
- `src/components/booking/FormulaInfoModal.tsx`
- `src/components/layout/Navbar.tsx`
- `src/pages/Reserver.tsx`
- `src/pages/MonEspace.tsx`
- `src/components/client/ClientLayout.tsx`
- `src/components/client/ClientSidebar.tsx`
- `src/components/ActivitiesView.tsx`
- `src/pages/Discover.tsx`

---

### 1.1 — Scroll en bas au clic sur formule (visiteur guest, modal info)
**Problème** : Quand un visiteur guest clique sur "Voir les formules carte yoga", la modal `FormulaInfoModal` s'ouvre mais le message "Vous devez créer un compte…" n'est pas visible sans scroller.
**Solution** : Dans `FormulaInfoModal.tsx`, après l'affichage des cartes, ajouter un `useEffect` + `ref` sur le bloc d'info en bas pour auto-scroller vers ce message dans le `DialogContent` à l'ouverture.

### 1.2 — Client connecté sans carte : bouton "Acheter carte yoga" puis formules
**Problème** : Le state `logged_user_no_cards` montre déjà un bouton toggle, mais le texte d'intro dit juste "achetez une carte yoga pour réserver vos cours" — il faut un bouton clair.
**Solution** : Vérifier et s'assurer que le bouton "Acheter carte yoga" est bien visible et que les formules apparaissent seulement au clic. Le code actuel semble correct (lignes 105-108 de PurchaseOptions). On va renforcer le label du bouton et ajouter le scroll vers les formules au clic.

### 1.3 — Mobile : afficher "Menu" pour client connecté
**Problème** : Le code `Navbar.tsx` ligne 134 montre bien "Menu" avec l'icône hamburger sur mobile. Mais la condition est dans un `<>` fragment avec `<Menu>` et `<span>Menu</span>`. Le problème est que `isLoggedIn` est vérifié mais la branche `isClient` n'est pas nécessaire — **tous** les utilisateurs connectés devraient voir "Menu".
**Solution** : Le code semble correct. Vérifier que la condition d'affichage ne masque pas le label. S'assurer que le texte "Menu" est visible pour tous les profils connectés (admin inclus).

### 1.4 — Crédits restants incorrects après achat carte + réservation
**Problème** : Quand un client achète 3 cartes (ex: 10 cours) et réserve, `addCredits(10)` ajoute 10, puis `useCredit()` en retire 1, mais le `paymentMode === "card_just_bought"` appelle `useCredit()` dans `handleFinalConfirm` — or les crédits affichés ne reflètent pas correctement la déduction.
**Solution** : Revoir la logique dans `Reserver.tsx` : quand `card_just_bought`, les crédits ajoutés via `addCredits` sont N, mais on doit immédiatement retirer 1 pour la réservation en cours. Vérifier que `useCredit()` est bien appelé et que le `currentProfile.credits` dans le contexte est mis à jour de manière synchrone avant l'affichage.

### 1.5 — Espace client : supprimer le menu sidebar, navigation par boutons
**Problème** : Le `ClientLayout` utilise un `SidebarProvider` + `ClientSidebar`. Le client veut des boutons directement sur l'écran, pas un menu latéral.
**Solution** : Remplacer `ClientLayout` par un layout simple avec des boutons de navigation (Accueil, Réservations, Cartes Yoga, Profil, Déconnexion) affichés directement en haut ou en bas de l'écran. Supprimer le `SidebarProvider`/`SidebarTrigger`. Utiliser des boutons/tabs horizontaux.

### 1.6 — Espace client : bouton "Ajouter cartes yoga" avant formules
**Problème** : Le code MonEspace.tsx ligne 281 a déjà un bouton toggle "Acheter carte yoga" qui révèle les formules. C'est déjà implémenté.
**Solution** : Renommer en "Ajouter cartes yoga" pour plus de clarté et vérifier que ça fonctionne.

### 1.7 — Vue semaine n'affiche pas le 29 mars (Cacao)
**Problème** : Le `WorkshopDatePicker` initialise `weekStart` à partir de `dates[0]`, la première date disponible. Si le 29 mars n'est pas dans la même semaine, il ne s'affiche pas.
**Solution** : Initialiser `weekStart` à la semaine courante (aujourd'hui) au lieu de la première date. Ainsi la navigation part d'aujourd'hui et l'utilisateur peut avancer vers le 29 mars.

### 1.8 — Scroll vers le haut au clic des boutons de navigation
**Problème** : Déjà implémenté dans `ClientSidebar` et `Discover`. Mais avec la suppression de la sidebar (1.5), il faut s'assurer que les nouveaux boutons de navigation font aussi le scroll.
**Solution** : Ajouter `window.scrollTo({ top: 0, behavior: "smooth" })` dans les handlers de navigation des nouveaux boutons.

### 1.9 — Label "Acheter carte yoga"
**Problème** : Déjà corrigé dans PurchaseOptions.tsx.
**Solution** : Vérifier cohérence partout.

### 1.10 — Client connecté ne voit pas son statut sur page visiteur
**Problème** : Déjà implémenté dans Navbar.tsx (badge avec nom + crédits).
**Solution** : Vérifier que le badge s'affiche bien sur mobile (condition `isClient`). Étendre à tous les profils connectés si nécessaire.

### 1.11 — Réservation annulée et compteur incorrect
**Problème** : Le filtre "Toutes" sur MonEspace ligne 178 montre `reservations.length` (toutes y compris annulées) mais le compteur de yoga/poterie/ateliers utilise `confirmedRes`. Le compteur "Toutes" devrait aussi exclure les annulées, ou au moins le total doit être cohérent.
**Solution** : Utiliser `confirmedRes.length` pour le compteur "Toutes" au lieu de `reservations.length`.

### 1.12 — "Rien de prévu" dans Yoga alors qu'il y a des cours récurrents
**Problème** : La logique actuelle dans ActivitiesView montre `RecurringGrid` + `MonthWorkshops` conditionnel. Si les données de `RecurringGrid` sont vides pour le mois sélectionné ou si le `yogaMonthOffset` filtre trop, le message peut apparaître.
**Solution** : Vérifier que `RecurringGrid` ne dépend pas du monthOffset (les cours récurrents sont hebdomadaires, pas liés à un mois). S'assurer que le message "Rien de prévu" n'apparaît que si les deux (récurrents ET workshops) sont vides.

---

### Détails techniques

**1.5 (majeur)** : Remplacement de `ClientLayout` :
```
┌─────────────────────────────────┐
│  Logo    Titre    [Déconnexion] │
├─────────────────────────────────┤
│ [Accueil][Réservations][Cartes] │
│ [Profil]                        │
├─────────────────────────────────┤
│        Contenu section          │
└─────────────────────────────────┘
```
Les boutons changent la `section` via `setSection()` et `navigate()`.

**1.7** : Changer l'initialisation de `weekStart` dans `WorkshopDatePicker` :
```typescript
const [weekStart, setWeekStart] = useState(() => getWeekOfDate(new Date()).start);
```

**1.4** : Le bug vient du fait que `addCredits` et `useCredit` sont asynchrones dans le state React. Si on fait `addCredits(10)` puis `useCredit()` dans le même cycle, le state peut ne pas être à jour. Solution : dans `handleStripeSuccess`, quand `pendingCard`, appeler `addCredits(pendingCard.sessions - 1)` directement au lieu de `addCredits(N)` + `useCredit()` séparément.

