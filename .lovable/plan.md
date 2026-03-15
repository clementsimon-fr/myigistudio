

## Plan révisé : 3 modifications

### 1. Espace Fournisseur vs Admin — permissions différenciées

**Principe** : Élodie (admin) voit Contrat et Fonctionnalités mais avec des restrictions. Le Fournisseur voit et peut tout modifier.

**Sur la page Contrat (`src/pages/admin/Contrat.tsx`)** :
- Le contenu est en lecture seule pour tout le monde (pas de formulaire d'édition actuellement) → pas de changement nécessaire, la page est déjà consultative.

**Sur la page Fonctionnalités (`src/pages/admin/Fonctionnalites.tsx`)** :
- Élodie (admin) **peut** : ajouter des feature requests (nouvelle idée), activer/ajouter depuis les exemples, changer le statut des demandes
- Élodie (admin) **ne peut pas** : créer/supprimer des exemples de fonctionnalités (le bouton "Gérer exemples" et les boutons de suppression d'exemples sont masqués)
- Fournisseur **peut** : tout faire, y compris créer et supprimer des exemples

**Implémentation** :
- Lire `currentProfile.role` via `useDemoContext()` dans `Fonctionnalites.tsx`
- Conditionner l'affichage du bouton "Gérer exemples" et des icônes `Trash2` sur les cartes d'exemples à `role === "fournisseur"`

**`src/contexts/DemoContext.tsx`** :
- Ajouter `"fournisseur"` au type `role`
- Ajouter un profil par défaut "Fournisseur" avec `role: "fournisseur"`
- Ajouter `clearTempProfiles()` (pour le point 2)

**`src/pages/Login.tsx`** :
- Ajouter une carte "Fournisseur" (icône `Wrench`) qui redirige vers `/admin/reservations`

**`src/components/admin/AdminSidebar.tsx`** :
- Pas de changement — Élodie voit toujours Contrat et Fonctionnalités dans le menu

### 2. Bouton "Réinitialiser" dans Admin Clients

**`src/pages/admin/Clients.tsx`** :
- Ajouter un bouton "Réinitialiser" (icône `RotateCcw`) dans le header
- `AlertDialog` de confirmation
- Si confirmé :
  1. `DELETE FROM reservations`
  2. `DELETE FROM client_cards`
  3. `DELETE FROM profiles`
  4. Appeler `clearTempProfiles()` du DemoContext
  5. Toast de succès + recharger la liste

**`src/contexts/DemoContext.tsx`** :
- Ajouter `clearTempProfiles()` qui vide `tempProfiles` et `localStorage`

### 3. Fond vert léger sous les filtres

**`src/components/ActivityFilterBar.tsx`** :
- Remplacer `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80` par `bg-emerald-50/60 backdrop-blur`

### Fichiers impactés

| Fichier | Changement |
|---------|-----------|
| `src/contexts/DemoContext.tsx` | Rôle `fournisseur`, profil par défaut, `clearTempProfiles()` |
| `src/pages/Login.tsx` | Carte Fournisseur |
| `src/pages/admin/Fonctionnalites.tsx` | Masquer gestion exemples si pas fournisseur |
| `src/pages/admin/Clients.tsx` | Bouton Réinitialiser |
| `src/components/ActivityFilterBar.tsx` | Fond vert léger |

