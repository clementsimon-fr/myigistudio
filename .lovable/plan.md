

## Plan : Connexion et inscription 100% démo (sans email/mot de passe)

### Problème
Les pages Login et Register affichent des champs email, mot de passe, téléphone — inutiles en mode démo. L'utilisateur veut un flux simple et fictif.

### Solution

**`src/pages/Login.tsx`** — Liste de profils cliquables :
- Supprimer le formulaire email/mot de passe
- Afficher directement la liste des profils existants (Élodie, Marion, Sophie + profils temporaires) comme boutons cliquables
- Chaque profil affiche le nom et le rôle (Administratrice, Cliente, etc.)
- Un bouton "Visiteur (déconnexion)" pour se déconnecter
- Un lien "Créer un compte" vers `/register`
- Cliquer sur un profil → connexion immédiate → redirection vers `returnTo` ou destination par défaut

**`src/pages/Register.tsx`** — Juste un champ prénom :
- Supprimer les champs email, téléphone, mot de passe
- Garder uniquement le champ "Prénom"
- Soumettre → `createTempProfile(prénom)` → redirection vers `returnTo` ou `/mon-espace`
- Le nouveau profil apparaîtra ensuite dans la liste de Login

### Flux résultant
1. Visiteur clique "Réserver" → redirigé vers `/login`
2. Voit les profils existants + lien "Créer un compte"
3. Option A : clique sur un profil → connecté → retour réservation
4. Option B : clique "Créer un compte" → saisit juste "Marc" → connecté → retour réservation
5. "Marc" apparaît désormais dans la liste de connexion

### Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/pages/Login.tsx` | Remplacer formulaire par liste de profils cliquables |
| `src/pages/Register.tsx` | Réduire à un seul champ prénom |

