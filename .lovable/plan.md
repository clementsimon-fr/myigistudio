

## Problème identifié

Le flux actuel sur `/reserver` pour un visiteur (non connecté) :

1. La page affiche le créneau pré-sélectionné, les conditions à accepter, et le bouton "Confirmer"
2. Le visiteur accepte les conditions, clique "Confirmer"
3. **Seulement là**, `handleProceedToConfirm` vérifie `!currentProfile` et redirige vers `/login`

C'est contre-intuitif : on demande d'accepter des conditions avant même de savoir qui est l'utilisateur.

## Solution : vérification de connexion dès le chargement

### Principe

Quand `directBooking === true` (arrivée depuis le planning avec créneau pré-sélectionné) ET `currentProfile === null` → rediriger **immédiatement** vers `/login?returnTo=...` dès le `useEffect` de chargement, avant même d'afficher le formulaire.

### Modification : `src/pages/Reserver.tsx`

1. **Ajouter un `useEffect` de vérification auth** : après le chargement des données (`loading === false`), si `directBooking && !currentProfile` → `navigate("/login?returnTo=...")` automatiquement. L'utilisateur ne voit même pas la page de réservation.

2. **Garder le check dans `handleConfirmClick`** comme filet de sécurité (cas non-directBooking où l'utilisateur navigue manuellement via le calendrier).

3. **Résultat du flux** :
   - Visiteur clique "Réserver" sur un atelier poterie
   - Redirigé vers `/login?returnTo=/reserver?type=workshop&id=...&date=...`
   - Choisit un profil ou crée un compte
   - Revient sur `/reserver` avec le profil actif
   - Voit les conditions + bouton confirmer → flux naturel

### Un seul fichier modifié

| Fichier | Changement |
|---------|-----------|
| `src/pages/Reserver.tsx` | Ajouter `useEffect` de redirection auth au chargement |

