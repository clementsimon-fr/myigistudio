

## Diagnostic des problèmes actuels

1. **Profil "Marc" invisible** : `createTempProfile` stocke le profil dans le DemoContext/localStorage, mais la page Login affiche uniquement 4 cartes hardcodées (`PROFILE_CARDS`). Les profils temporaires créés pendant la démo ne sont jamais retrouvés.

2. **Bloc "Connexion rapide" intrusif** : Quand un visiteur clique "Confirmer", un bloc apparaît *inline* sur la même page avec un champ prénom. C'est déroutant — on ne comprend pas pourquoi le formulaire de réservation change soudainement.

3. **Page Register déconnectée** : `/register` ne crée pas de profil dans le DemoContext. Elle fait juste `navigate("/mon-espace")` sans rien sauvegarder.

4. **Pas de retour après login** : Si l'utilisateur est redirigé vers `/login` ou `/register`, il perd le contexte de sa réservation en cours.

---

## Plan de correction

### Principe : redirections avec `returnTo`, comme une vraie app

Au lieu d'injecter des étapes inline dans la page Reserver, on redirige vers `/login` ou `/register` avec un paramètre `?returnTo=...` qui ramène l'utilisateur exactement où il était après connexion.

### 1. Supprimer le bloc "Connexion rapide" inline de Reserver.tsx

- Supprimer le `bookingStep === "login"` et le champ prénom inline
- Quand `currentProfile === null` et que l'utilisateur clique "Confirmer" → `navigate("/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search))`
- Garder le step "credits" (achat de carte) car il fait partie du tunnel d'achat, pas du login

### 2. Modifier Login.tsx — support `returnTo` + profils récents

- Lire le paramètre `?returnTo=...` depuis l'URL
- Après sélection d'un profil → naviguer vers `returnTo` au lieu de la destination hardcodée (sauf pour Visiteur et Admin)
- Ajouter une section "Profils récents" qui affiche les profils temporaires sauvegardés dans localStorage (pour retrouver "Marc")
- Ajouter un lien "Nouveau compte" vers `/register?returnTo=...`

### 3. Modifier Register.tsx — créer un vrai profil démo

- Connecter au DemoContext : `createTempProfile(form.name)`
- Supporter `?returnTo=...` pour revenir à la réservation
- Le formulaire reste simple (prénom + email pour l'apparence) mais seul le prénom est utilisé côté démo

### 4. Persister les profils temporaires dans le DemoContext

- Ajouter un `tempProfiles: DemoProfile[]` dans le DemoContext, persisté en localStorage
- `createTempProfile` ajoute aussi le profil à cette liste
- La page Login lit `tempProfiles` pour afficher les profils récemment créés

### Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/contexts/DemoContext.tsx` | Ajouter `tempProfiles[]` persisté + exposer dans le contexte |
| `src/pages/Login.tsx` | Support `returnTo`, afficher profils récents depuis `tempProfiles` |
| `src/pages/Register.tsx` | Utiliser `createTempProfile` + support `returnTo` |
| `src/pages/Reserver.tsx` | Supprimer bloc login inline, rediriger vers `/login?returnTo=...` |

