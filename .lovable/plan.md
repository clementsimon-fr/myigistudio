

## Plan : Page de connexion réaliste

### Problème
La page `/login` affiche directement les profils démo (Élodie, Marion, Sophie, Visiteur) — ça ne ressemble pas à une vraie app. L'utilisateur veut voir un vrai écran "Se connecter" ou "Créer un compte".

### Solution : Login réaliste avec profils démo en sous-couche

**Réécrire `src/pages/Login.tsx`** pour afficher un vrai formulaire de connexion :

1. **Vue par défaut** : formulaire email + mot de passe classique avec bouton "Se connecter" et lien "Créer un compte" vers `/register`
2. **Connexion simulée** : quand l'utilisateur soumet le formulaire, on cherche un profil existant dont le nom correspond (parmi les profils par défaut + `tempProfiles`). Si trouvé → connecté. Sinon → message d'erreur "Aucun compte trouvé".
3. **Profils prédéfinis accessibles** : une petite section discrète en bas "Accès rapide démo" avec les 4 profils (Élodie, Marion, Sophie, Visiteur) pour garder la fonctionnalité de switch rapide. Visuellement secondaire (style lien/texte, pas cartes proéminentes).
4. **Lien "Créer un compte"** → `/register` (qui existe déjà et fonctionne avec `createTempProfile`)

### Flux résultant
- Visiteur clique "Réserver" → redirigé vers `/login?returnTo=...`
- Voit un formulaire classique : "Se connecter" / "Pas encore de compte ? Créer un compte"
- Option A : remplit email → match avec un profil existant → connecté → retour réservation
- Option B : clique "Créer un compte" → `/register` → crée profil → retour réservation
- Option C (démo) : clique sur un profil rapide en bas

### Fichier impacté

| Fichier | Changement |
|---------|-----------|
| `src/pages/Login.tsx` | Réécrire : formulaire email/mdp + section démo discrète en bas |

