

## Plan : Mode Démo Interactif MyIgiStudio

### Vue d'ensemble

Créer un système de démonstration complet basé sur un **contexte React (DemoContext)** stocké en `localStorage`, simulant profils, crédits, achats et notifications admin — sans auth ni Stripe réels.

---

### 1. DemoContext — Le cœur du système

**Nouveau fichier : `src/contexts/DemoContext.tsx`**

- `DemoProfile` : `{ id, name, role: "admin" | "client" | "visitor", credits, cards[], reservations[] }`
- Profils prédéfinis :
  - **Élodie (Admin)** : accès admin
  - **Marion (Nouvelle cliente)** : 0 crédit, pas de carte
  - **Sophie (Cliente existante)** : 4 crédits, carte active (données actuelles)
  - **Visiteur** : null (déconnecté)
- State : `currentProfile`, `demoNotifications[]` (flux admin), `addCredits()`, `addReservation()`, `addNotification()`
- Persistance `localStorage` pour garder le profil sélectionné entre navigations
- `useDemoContext()` hook exporté

---

### 2. Sélecteur de Profil (remplace Login)

**Modifier : `src/pages/Login.tsx`**

Remplacer les 2 boutons actuels (Client/Admin) par 4 cartes de profil :
- **Élodie (Admin)** → navigue vers `/admin/reservations`
- **Marion** → navigue vers `/mon-espace`
- **Sophie** → navigue vers `/mon-espace`
- **Visiteur** → navigue vers `/` (déconnecté)

Chaque carte montre : avatar, nom, rôle, crédits restants. Au clic → `setCurrentProfile()` + navigation.

---

### 3. Tunnel d'achat & réservation simulé

**Modifier : `src/pages/Reserver.tsx`**

Injecter des étapes avant la confirmation actuelle :

1. **Vérification connexion** : Si `currentProfile === null` → afficher mini-formulaire "Entrez votre prénom" → crée un profil temporaire dans le DemoContext
2. **Vérification crédits** (cours Yoga/Pilates) : Si `credits === 0` → proposer achat carte (1 cours = 18€, 5 = 70€, 10 = 130€)
3. **Achat direct** (Poterie/Ateliers) : Proposer paiement unique du prix de l'atelier
4. **Modal Stripe simulée** : Interface élégante imitant Stripe (numéro carte `4242...`, date, CVC pré-remplis) avec bouton "Confirmer le paiement (Simulé)"
5. **Succès** : Incrémenter crédits, confirmer réservation, ajouter notification admin

**Nouveau composant : `src/components/demo/MockStripeModal.tsx`**
- Modale avec design Stripe-like (fond sombre, champs carte pré-remplis)
- Bouton "Payer X€" avec animation de chargement 1.5s
- Callback `onSuccess` pour déclencher les mises à jour

---

### 4. Notifications Admin "Live"

**Modifier : `src/pages/admin/Dashboard.tsx`**

- Lire `demoNotifications` depuis DemoContext en plus des données Supabase
- Chaque action demo génère une notification : 
  - "Marion vient d'acheter une carte 10 cours"
  - "Sophie a réservé Vinyasa Flow du 18 mars"
  - "Julie (visiteur) a créé un compte"
- Afficher avec un badge "LIVE" et timestamp relatif

---

### 5. Adaptation des pages existantes

**`src/pages/MonEspace.tsx`** :
- Remplacer le `CLIENT_NAME = "Sophie"` hardcodé par `currentProfile.name` du DemoContext
- Afficher crédits/cartes depuis le DemoContext au lieu de requêtes Supabase seules (merge des données)

**`src/components/layout/Navbar.tsx`** :
- Afficher le nom du profil actif au lieu de "Connexion"
- Lien "Changer de profil" vers `/login`

**`src/App.tsx`** :
- Wrapper `<DemoProvider>` autour de tout

---

### Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/contexts/DemoContext.tsx` | Créer |
| `src/components/demo/MockStripeModal.tsx` | Créer |
| `src/pages/Login.tsx` | Réécrire (sélecteur profil) |
| `src/pages/Reserver.tsx` | Ajouter vérif crédits + modal Stripe |
| `src/pages/MonEspace.tsx` | Utiliser DemoContext pour le profil |
| `src/pages/admin/Dashboard.tsx` | Ajouter notifications live |
| `src/components/layout/Navbar.tsx` | Afficher profil actif |
| `src/App.tsx` | Ajouter DemoProvider |

